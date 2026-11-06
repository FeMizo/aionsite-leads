import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(), decide: vi.fn(), finding: vi.fn(), credential: vi.fn(),
}));

vi.mock("@/lib/prospect-crawl-auth", () => ({ isAuthenticatedProspectCrawlRequest: mocks.authenticate }));
vi.mock("@/lib/prospect-research", () => ({ decideResearchFinding: mocks.decide }));
vi.mock("@/lib/db", () => ({ getPrismaClient: () => ({
  prospectResearchFinding: { findFirst: mocks.finding }, dashboardCredential: { findUnique: mocks.credential },
}) }));

import { PATCH } from "@/app/api/prospects/[id]/research/[findingId]/route";

function request() {
  return new NextRequest("http://localhost/api/prospects/p1/research/f1", { method: "PATCH", body: JSON.stringify({ decision: "approve" }), headers: { "Content-Type": "application/json" } });
}
const context = () => ({ params: Promise.resolve({ id: "p1", findingId: "f1" }) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticate.mockResolvedValue(true);
  mocks.finding.mockResolvedValue({ id: "f1" });
  mocks.credential.mockResolvedValue({ username: "reviewer" });
  mocks.decide.mockResolvedValue({ stale: false });
});

describe("research decision endpoint", () => {
  it("requires authentication before reading findings", async () => {
    mocks.authenticate.mockResolvedValue(false);
    expect((await PATCH(request(), context())).status).toBe(401);
    expect(mocks.finding).not.toHaveBeenCalled();
    expect(mocks.decide).not.toHaveBeenCalled();
  });

  it("checks the finding belongs to the requested prospect", async () => {
    mocks.finding.mockResolvedValue(null);
    expect((await PATCH(request(), context())).status).toBe(404);
    expect(mocks.finding).toHaveBeenCalledWith({ where: { id: "f1", research: { prospectId: "p1" } } });
    expect(mocks.decide).not.toHaveBeenCalled();
  });

  it("returns a safe conflict response for a concurrent prospect update", async () => {
    mocks.decide.mockRejectedValue(Object.assign(new Error("internal database details"), { code: "P2025" }));
    const response = await PATCH(request(), context());
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain("cambió durante la revisión");
    expect(body.error).not.toContain("internal database");
  });

  it("records the authenticated reviewer when applying an approval", async () => {
    expect((await PATCH(request(), context())).status).toBe(200);
    expect(mocks.decide).toHaveBeenCalledWith("f1", "approve", "reviewer");
  });
});
