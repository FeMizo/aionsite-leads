import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prospectFindUnique: vi.fn(),
  researchCreate: vi.fn(),
  researchCreateMany: vi.fn(),
  researchFindFirst: vi.fn(),
  researchUpdate: vi.fn(),
  findingFindUnique: vi.fn(),
  findingCreateMany: vi.fn(),
  findingUpdate: vi.fn(),
  prospectUpdate: vi.fn(),
  contactEventCreate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getPrismaClient: () => ({
    prospect: { findUnique: mocks.prospectFindUnique, update: mocks.prospectUpdate },
    prospectResearch: { findFirst: mocks.researchFindFirst, create: mocks.researchCreate, createMany: mocks.researchCreateMany, update: mocks.researchUpdate },
    prospectResearchFinding: { findUnique: mocks.findingFindUnique, createMany: mocks.findingCreateMany, update: mocks.findingUpdate },
    contactEvent: { create: mocks.contactEventCreate },
    $transaction: (callback: (tx: unknown) => unknown) => callback({
      prospect: { findUnique: mocks.prospectFindUnique, update: mocks.prospectUpdate },
      prospectResearch: { findFirst: mocks.researchFindFirst, create: mocks.researchCreate, createMany: mocks.researchCreateMany, update: mocks.researchUpdate },
      prospectResearchFinding: { findUnique: mocks.findingFindUnique, createMany: mocks.findingCreateMany, update: mocks.findingUpdate },
      contactEvent: { create: mocks.contactEventCreate },
    }),
  }),
}));

vi.mock("@/providers/prospect-research", () => ({
  researchGooglePlace: vi.fn(),
  researchBraveSocialProfile: vi.fn(),
}));
vi.mock("@/providers/email-finder", () => ({ findEmailFromWebsite: vi.fn() }));

import { findEmailFromWebsite } from "@/providers/email-finder";
import { researchBraveSocialProfile, researchGooglePlace } from "@/providers/prospect-research";
import { decideResearchFinding, runProspectResearch } from "@/lib/prospect-research";

const prospect = {
  id: "p1", name: "Tienda Centro", normalizedName: "tienda centro", contactName: "",
  city: "Mérida", email: "", normalizedEmail: "", phone: "9991234567", normalizedPhone: "9991234567",
  type: "Tienda", website: "https://tienda.example", rating: "4.2", userRatingCount: 12,
  websiteFetchFailed: false, websiteLoadTimeMs: 700, hasWhatsappCta: null, hasContactCta: null,
  isMobileFriendly: null, mapsUrl: "", formattedAddress: "", primaryType: "", businessStatus: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prospectFindUnique.mockResolvedValue(prospect);
  mocks.researchCreate.mockResolvedValue({ id: "research-1", prospectId: "p1" });
  mocks.researchFindFirst.mockResolvedValue(null);
  mocks.findingCreateMany.mockResolvedValue({ count: 1 });
  mocks.researchUpdate.mockImplementation(({ data, include }: { data: Record<string, unknown>; include: unknown }) => Promise.resolve({
    id: "research-1", ...data, findings: include ? mocks.findingCreateMany.mock.calls[0]?.[0]?.data || [] : [],
  }));
  vi.mocked(researchGooglePlace).mockResolvedValue({ values: [
    { field: "phone", value: "(999) 123-4567", sourceName: "Google Places", sourceUrl: "https://maps.google.com/place", confidence: "high", confidenceReason: "exact match" },
    { field: "rating", value: 4.8, sourceName: "Google Places", sourceUrl: "https://maps.google.com/place", confidence: "high", confidenceReason: "exact match" },
  ] });
  vi.mocked(researchBraveSocialProfile).mockResolvedValue({ values: [], skipped: true });
  vi.mocked(findEmailFromWebsite).mockResolvedValue({
    email: "hola@tienda.example", fetchCount: 1,
    sourceUrl: "https://tienda.example/contacto", auditSourceUrl: "https://tienda.example",
    audit: { fetchFailed: false, loadTimeMs: 800, hasWhatsappCta: true, hasContactCta: true, isMobileFriendly: true },
  });
});

describe("prospect research persistence", () => {
  it("stores only verified changes and omits equivalent phone values", async () => {
    await runProspectResearch("p1");
    const stored = mocks.findingCreateMany.mock.calls[0][0].data;
    expect(stored.map((item: { field: string }) => item.field)).toEqual(expect.arrayContaining(["rating", "email", "hasWhatsappCta"]));
    expect(stored.some((item: { field: string }) => item.field === "phone")).toBe(false);
    expect(stored.find((item: { field: string }) => item.field === "email")).toMatchObject({
      sourceName: "Sitio del negocio", sourceUrl: "https://tienda.example/contacto", confidence: "high",
    });
    expect(mocks.prospectUpdate).not.toHaveBeenCalled();
  });

  it("applies an approved field and records the source and decision in ContactEvent", async () => {
    mocks.findingFindUnique.mockResolvedValue({
      id: "f1", field: "email", currentValue: JSON.stringify(""), proposedValue: JSON.stringify("hola@tienda.example"),
      researchId: "research-1", sourceName: "Sitio del negocio", sourceUrl: "https://tienda.example/contacto",
      confidence: "high", confidenceReason: "found on site", status: "pending", research: { prospectId: "p1" },
    });
    await decideResearchFinding("f1", "approve", "admin");
    expect(mocks.prospectUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: expect.objectContaining({ email: "hola@tienda.example", normalizedEmail: "hola@tienda.example", lastCheckedAt: expect.any(Date) }) });
    expect(mocks.findingUpdate.mock.calls[0][0].data).toMatchObject({ status: "approved", decision: "approve", decidedBy: "admin" });
    expect(mocks.contactEventCreate.mock.calls[0][0].data).toMatchObject({
      eventType: "research_finding_approved",
      metadata: { sourceUrl: "https://tienda.example/contacto", field: "email", decision: "approve", proposedValue: "hola@tienda.example", confidenceReason: "found on site" },
    });
  });

  it("does not overwrite a field changed since research", async () => {
    mocks.findingFindUnique.mockResolvedValue({
      id: "f1", field: "email", currentValue: JSON.stringify(""), proposedValue: JSON.stringify("hola@tienda.example"),
      researchId: "research-1", confidence: "high", confidenceReason: "found on site", status: "pending", research: { prospectId: "p1" },
    });
    mocks.prospectFindUnique.mockResolvedValue({ ...prospect, email: "otro@tienda.example" });
    await expect(decideResearchFinding("f1", "approve", "admin")).resolves.toEqual({ stale: true });
    expect(mocks.prospectUpdate).not.toHaveBeenCalled();
    expect(mocks.contactEventCreate.mock.calls[0][0].data.eventType).toBe("research_finding_stale");
  });
});
