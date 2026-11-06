import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrismaClient: () => ({ prospect: mocks }) }));
vi.mock("@/lib/prospect-scoring", () => ({
  getProspectScoreCard: () => ({ score: 50, priority: "medium" }),
  getProspectScoreBreakdown: () => ({}),
}));

import { getAllDashboardProspects, getProspectsByStatuses } from "@/lib/dashboard";

const fixture = (id: string) => ({
  id, name: `Prueba ${id}`, status: "approved",
  nextAction: "Revisar propuesta", owner: "Responsable de prueba",
  nextFollowupAt: new Date("2026-11-10T15:00:00Z"),
  createdAt: new Date("2026-11-01T12:00:00Z"),
  updatedAt: new Date("2026-11-01T12:00:00Z"),
  lastCheckedAt: new Date("2026-11-01T12:00:00Z"),
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findMany.mockResolvedValue([fixture("a"), fixture("b")]);
  mocks.count.mockResolvedValue(100);
});

describe("dashboard contact query count (isolated test data)", () => {
  it("preserves saved next steps, owner and followup date in CRM results", async () => {
    const records = await getAllDashboardProspects();
    expect(records[0]).toMatchObject({ nextAction: "Revisar propuesta",
      owner: "Responsable de prueba", nextFollowupAt: "2026-11-10T15:00:00.000Z" });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({ nextAction: true, owner: true, nextFollowupAt: true }),
    }));
  });

  it("preserves missing followup values in paginated results", async () => {
    mocks.findMany.mockResolvedValue([{ ...fixture("a"), nextAction: "", owner: "", nextFollowupAt: null }]);
    const result = await getProspectsByStatuses({ statuses: ["approved"], page: 1, pageSize: 25 });
    expect(result.items[0]).toMatchObject({ nextAction: "", owner: "", nextFollowupAt: null });
    expect(result.totalCount).toBe(100);
  });

  it("measures query calls and elapsed time with 100 synthetic CRM loads", async () => {
    mocks.count.mockResolvedValue(2);
    const start = performance.now();
    for (let index = 0; index < 100; index++) {
      expect((await getAllDashboardProspects()).map(item => item.id)).toEqual(["a", "b"]);
    }
    const evidence = { environment: "mock-only, no database", loads: 100,
      queries: mocks.findMany.mock.calls.length + mocks.count.mock.calls.length,
      elapsedMs: Number((performance.now() - start).toFixed(3)) };
    if (process.env.LEADS_QUERY_EVIDENCE) {
      writeFileSync(process.env.LEADS_QUERY_EVIDENCE, JSON.stringify(evidence, null, 2));
    }
  });

  it("derives the exact unpaginated total without a redundant count", async () => {
    const result = await getProspectsByStatuses({ statuses: ["approved"] });
    expect(result.items.map(item => item.id)).toEqual(["a", "b"]);
    expect(result.totalCount).toBe(2);
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.count).not.toHaveBeenCalled();
  });

  it("keeps the global count and offset for paginated requests", async () => {
    const result = await getProspectsByStatuses({ statuses: ["approved"], page: 2, pageSize: 25 });
    expect(result.totalCount).toBe(100);
    expect(mocks.count).toHaveBeenCalledExactlyOnceWith({ where: { status: { in: ["approved"] } } });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 25, take: 25 }));
  });

  it("preserves scheduled and status filters for both paginated queries", async () => {
    await getProspectsByStatuses({ statuses: ["ready"], scheduledOnly: true, page: 1, pageSize: 25 });
    const where = mocks.findMany.mock.calls[0][0].where;
    expect(where).toEqual({ status: { in: ["ready"] }, scheduledSendAt: { gt: expect.any(Date) } });
    expect(mocks.count).toHaveBeenCalledWith({ where });
  });

  it("returns an exact zero for an empty unpaginated result", async () => {
    mocks.findMany.mockResolvedValue([]);
    expect(await getProspectsByStatuses({ statuses: ["approved"], unscheduledOnly: true }))
      .toEqual({ items: [], totalCount: 0 });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: { in: ["approved"] }, scheduledSendAt: null },
    }));
    expect(mocks.count).not.toHaveBeenCalled();
  });

  it("loads the complete CRM with one query and preserves record order", async () => {
    expect((await getAllDashboardProspects()).map(item => item.id)).toEqual(["a", "b"]);
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.count).not.toHaveBeenCalled();
  });
});
