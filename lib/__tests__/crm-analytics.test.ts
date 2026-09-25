import { describe, expect, it } from "vitest";
import { buildCrmAnalytics } from "@/lib/crm-analytics";

describe("CRM analytics", () => {
  it("groups response performance by commercial dimensions", () => {
    const result = buildCrmAnalytics([
      { city: "Mérida", type: "dentista", source: "google", promptVersion: "v1", recommendedOffer: "web", status: "replied", responseCategory: "interesado", revenue: 1000 },
      { city: "Mérida", type: "dentista", source: "google", promptVersion: "v1", recommendedOffer: "web", status: "contacted", responseCategory: "", revenue: null },
    ]);

    expect(result.totals).toMatchObject({ prospects: 2, contacted: 2, replied: 1, interested: 1, closed: 0, revenue: 1000 });
    expect(result.byCity["Mérida"]).toEqual({ prospects: 2, replied: 1, interested: 1 });
    expect(result.byPrompt.v1.replied).toBe(1);
  });
});
