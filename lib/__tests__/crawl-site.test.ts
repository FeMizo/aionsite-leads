import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Crawl-Site summary PDF integration", () => {
  it("starts a crawl against the configured endpoint and consumes its real done SSE payload", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CRAWLSITE_URL", "https://crawl.example.test");
    vi.stubEnv("CRAWLSITE_API_TOKEN", "fixture-secret");
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ project: { id: "project-1" } }))
      .mockResolvedValueOnce(new Response('event: started\ndata: {"runId":"run-1","ownerUserId":"user-owner"}\n\nevent: done\ndata: {"runId":"run-1","total":4,"withIssues":2,"stats":{"404":1},"ownerUserId":"user-owner"}\n\n', {
        status: 200, headers: { "content-type": "text/event-stream" },
      }));
    vi.stubGlobal("fetch", fetch);
    const { crawlWebsiteInCrawlSite } = await import("@/providers/crawl-site");
    const result = await crawlWebsiteInCrawlSite("https://example.com", "local-idempotency-key");
    expect(result).toEqual({ runId: "run-1", projectId: "project-1", ownerUserId: "user-owner", status: "completed", summary: { total: 4, withIssues: 2, stats: { "404": 1 } } });
    expect(String(fetch.mock.calls[1][0])).toContain("/api/crawl?");
    expect(fetch.mock.calls[1][1].headers["Idempotency-Key"]).toBe("local-idempotency-key");
    expect(JSON.stringify(result)).not.toContain("fixture-secret");
  });

  it("reports an SSE error instead of treating a pending or failed run as complete", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CRAWLSITE_URL", "https://crawl.example.test");
    vi.stubEnv("CRAWLSITE_API_TOKEN", "fixture-secret");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({ project: { id: "project-1" } }))
      .mockResolvedValueOnce(new Response("event: error\ndata: {\"error\":\"failed\"}\n\n", { status: 200 })));
    const { crawlWebsiteInCrawlSite } = await import("@/providers/crawl-site");
    await expect(crawlWebsiteInCrawlSite("https://example.com")).rejects.toThrow("no pudo completar");
  });

  it("preserves a started run as pending if the stream ends before completion", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CRAWLSITE_URL", "https://crawl.example.test");
    vi.stubEnv("CRAWLSITE_API_TOKEN", "fixture-secret");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({ project: { id: "project-1" } }))
      .mockResolvedValueOnce(new Response('event: started\ndata: {"runId":"run-pending","ownerUserId":"user-owner"}\n\n', { status: 200 })));
    const { crawlWebsiteInCrawlSite } = await import("@/providers/crawl-site");
    await expect(crawlWebsiteInCrawlSite("https://example.com", "stable-key")).resolves.toMatchObject({
      runId: "run-pending", ownerUserId: "user-owner", status: "pending",
    });
  });

  it("downloads and validates an authenticated PDF for a completed crawl", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CRAWLSITE_URL", "https://crawl.example.test/");
    vi.stubEnv("CRAWLSITE_API_TOKEN", "test-token-not-a-real-secret");
    const pdf = Buffer.from("%PDF-1.4\nfixture");
    const fetch = vi.fn().mockResolvedValue(new Response(pdf, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="resumen-seo-example.com-2026-09-15.pdf"',
      },
    }));
    vi.stubGlobal("fetch", fetch);

    const { getCrawlSummaryPdf } = await import("@/providers/crawl-site");
    const result = await getCrawlSummaryPdf("crawl-run-1");

    expect(result.filename).toBe("resumen-seo-example.com-2026-09-15.pdf");
    expect(result.content).toEqual(pdf);
    expect(fetch).toHaveBeenCalledWith(
      "https://crawl.example.test/api/integrations/runs/crawl-run-1/summary.pdf",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token-not-a-real-secret" }),
        cache: "no-store",
      })
    );
  });

  it("rejects a non-PDF response", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CRAWLSITE_URL", "https://crawl.example.test");
    vi.stubEnv("CRAWLSITE_API_TOKEN", "test-token-not-a-real-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not a pdf", {
      status: 200,
      headers: { "content-type": "text/plain" },
    })));

    const { getCrawlSummaryPdf } = await import("@/providers/crawl-site");
    await expect(getCrawlSummaryPdf("crawl-run-1")).rejects.toThrow("sin un archivo PDF válido");
  });
});
