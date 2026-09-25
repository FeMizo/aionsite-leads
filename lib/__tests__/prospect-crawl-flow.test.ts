import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prospectFindUnique: vi.fn(),
  credentialFindUnique: vi.fn(),
  crawlFindFirst: vi.fn(),
  crawlCreate: vi.fn(),
  crawlUpdate: vi.fn(),
  prospectUpdate: vi.fn(),
  startCrawl: vi.fn(),
  fetchPdf: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getPrismaClient: () => ({
  prospect: { findUnique: mocks.prospectFindUnique, update: mocks.prospectUpdate },
  dashboardCredential: { findUnique: mocks.credentialFindUnique },
  prospectCrawl: { findFirst: mocks.crawlFindFirst, create: mocks.crawlCreate, update: mocks.crawlUpdate },
}) }));
vi.mock("@/providers/crawl-site", () => ({
  crawlWebsiteInCrawlSite: mocks.startCrawl,
  getCrawlSummaryPdf: mocks.fetchPdf,
}));

import { startProspectCrawl } from "@/lib/prospect-crawls";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prospectFindUnique.mockResolvedValue({ id: "p1", website: "https://example.com" });
  mocks.credentialFindUnique.mockResolvedValue({ username: "leads-owner" });
  mocks.crawlFindFirst.mockResolvedValue(null);
  mocks.crawlCreate.mockResolvedValue({ id: "crawl-history-1", prospectId: "p1", siteUrl: "https://example.com", attemptCount: 1 });
  mocks.crawlUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: "crawl-history-1", ...data }));
  mocks.prospectUpdate.mockResolvedValue({});
  mocks.fetchPdf.mockResolvedValue({ filename: "summary.pdf", content: Buffer.from("%PDF-1.4") });
});

describe("prospect crawl history flow", () => {
  it("stores the credential owner, completed run, summary and private PDF", async () => {
    mocks.startCrawl.mockResolvedValue({
      runId: "run-1", projectId: "project-1", ownerUserId: "crawl-owner-1", status: "completed",
      summary: { total: 4, withIssues: 1, stats: { "404": 1 } },
    });
    const result = await startProspectCrawl("p1");
    expect(mocks.startCrawl).toHaveBeenCalledWith("https://example.com", "crawl-history-1:1");
    expect(mocks.fetchPdf).toHaveBeenCalledWith("run-1");
    expect(result).toMatchObject({ status: "completed", crawlOwnerUserId: "crawl-owner-1", pdfFilename: "summary.pdf" });
    expect(mocks.crawlUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "crawl-history-1" },
      data: expect.objectContaining({ crawlSiteRunId: "run-1", status: "completed", summary: expect.any(Object) }),
    }));
  });

  it("keeps an unfinished crawl pending and does not request its PDF early", async () => {
    mocks.startCrawl.mockResolvedValue({ runId: "run-pending", projectId: "project-1", ownerUserId: "crawl-owner-1", status: "pending" });
    const result = await startProspectCrawl("p1");
    expect(result).toMatchObject({ status: "pending" });
    expect(mocks.crawlUpdate.mock.calls[0][0].data).toMatchObject({
      crawlSiteRunId: "run-pending", projectId: "project-1", crawlOwnerUserId: "crawl-owner-1",
    });
    expect(mocks.fetchPdf).not.toHaveBeenCalled();
  });

  it("records a terminal crawl failure so retry can create a new idempotency key", async () => {
    const failure = Object.assign(new Error("Crawl failed"), { crawlRunId: "run-failed", terminal: true });
    mocks.startCrawl.mockRejectedValue(failure);
    const result = await startProspectCrawl("p1");
    expect(result).toMatchObject({ status: "failed", crawlSiteRunId: "run-failed", error: "Crawl failed" });
    expect(mocks.fetchPdf).not.toHaveBeenCalled();
  });

  it("rejects WhatsApp links before creating crawl history or calling Crawl-Site", async () => {
    mocks.prospectFindUnique.mockResolvedValue({ id: "p1", website: "https://wa.me/529381573988" });

    await expect(startProspectCrawl("p1")).rejects.toThrow("No se permite rastrear enlaces de contacto");
    expect(mocks.crawlCreate).not.toHaveBeenCalled();
    expect(mocks.startCrawl).not.toHaveBeenCalled();
  });
});
