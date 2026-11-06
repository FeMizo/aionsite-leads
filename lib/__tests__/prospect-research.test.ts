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
  findingUpdateMany: vi.fn(),
  prospectUpdate: vi.fn(),
  contactEventCreate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getPrismaClient: () => ({
    prospect: { findUnique: mocks.prospectFindUnique, update: mocks.prospectUpdate },
    prospectResearch: { findFirst: mocks.researchFindFirst, create: mocks.researchCreate, createMany: mocks.researchCreateMany, update: mocks.researchUpdate },
    prospectResearchFinding: { findUnique: mocks.findingFindUnique, createMany: mocks.findingCreateMany, update: mocks.findingUpdate, updateMany: mocks.findingUpdateMany },
    contactEvent: { create: mocks.contactEventCreate },
    $transaction: (callback: (tx: unknown) => unknown) => callback({
      prospect: { findUnique: mocks.prospectFindUnique, update: mocks.prospectUpdate },
      prospectResearch: { findFirst: mocks.researchFindFirst, create: mocks.researchCreate, createMany: mocks.researchCreateMany, update: mocks.researchUpdate },
      prospectResearchFinding: { findUnique: mocks.findingFindUnique, createMany: mocks.findingCreateMany, update: mocks.findingUpdate, updateMany: mocks.findingUpdateMany },
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
  updatedAt: new Date("2026-10-29T12:00:00Z"),
  id: "p1", name: "Tienda Centro", normalizedName: "tienda centro", contactName: "",
  city: "Mérida", email: "", normalizedEmail: "", phone: "9991234567", normalizedPhone: "9991234567",
  type: "Tienda", website: "https://tienda.example", rating: "4.2", userRatingCount: 12,
  websiteFetchFailed: false, websiteLoadTimeMs: 700, hasWhatsappCta: null, hasContactCta: null,
  isMobileFriendly: null, mapsUrl: "", formattedAddress: "", primaryType: "", businessStatus: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prospectFindUnique.mockResolvedValue(prospect);
  mocks.findingUpdateMany.mockResolvedValue({ count: 1 });
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
    expect(mocks.prospectUpdate).toHaveBeenCalledWith({ where: { id: "p1", updatedAt: prospect.updatedAt }, data: expect.objectContaining({ email: "hola@tienda.example", normalizedEmail: "hola@tienda.example", lastCheckedAt: expect.any(Date) }) });
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

const pendingFinding = {
  id: "f1", field: "email", currentValue: JSON.stringify(""), proposedValue: JSON.stringify("hola@tienda.example"),
  researchId: "research-1", sourceName: "Sitio del negocio", sourceUrl: "https://tienda.example/contacto",
  confidence: "high", confidenceReason: "found on site", status: "pending", research: { prospectId: "p1" },
};

describe("research approval safeguards", () => {
  it("refuses a concurrent decision before modifying the prospect or audit log", async () => {
    mocks.findingFindUnique.mockResolvedValue(pendingFinding);
    mocks.findingUpdateMany.mockResolvedValue({ count: 0 });
    await expect(decideResearchFinding("f1", "approve", "admin")).rejects.toThrow("ya tiene una decisión");
    expect(mocks.prospectUpdate).not.toHaveBeenCalled();
    expect(mocks.contactEventCreate).not.toHaveBeenCalled();
    expect(mocks.findingUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "f1", status: "pending" } }));
  });

  it("keeps an unknown numeric value distinct from a measured zero", async () => {
    mocks.prospectFindUnique.mockResolvedValue({ ...prospect, websiteLoadTimeMs: 0 });
    mocks.findingFindUnique.mockResolvedValue({ ...pendingFinding, field: "websiteLoadTimeMs", currentValue: "null", proposedValue: "10" });
    await expect(decideResearchFinding("f1", "approve", "admin")).resolves.toEqual({ stale: true });
    expect(mocks.prospectUpdate).not.toHaveBeenCalled();
  });

  it("normalizes approved website URLs", async () => {
    mocks.findingFindUnique.mockResolvedValue({ ...pendingFinding, field: "website", currentValue: JSON.stringify(prospect.website), proposedValue: JSON.stringify("https://business.example/?utm_source=google#contact") });
    await decideResearchFinding("f1", "approve", "admin");
    expect(mocks.prospectUpdate).toHaveBeenCalledWith({ where: { id: "p1", updatedAt: prospect.updatedAt }, data: expect.objectContaining({ website: "https://business.example" }) });
  });

  it.each([
    ["website", "https://wa.me/529991234567"],
    ["website", "https://bit.ly/example"],
    ["website", "https://facebook.com/business"],
    ["website", "https://user:password@business.example"],
    ["website", "javascript:alert(1)"],
    ["email", "invalid-address"],
    ["email", { address: "hello@example.com" }],
    ["rating", 9],
    ["rating", "4.8"],
    ["userRatingCount", null],
    ["userRatingCount", -1],
    ["userRatingCount", 1.5],
    ["websiteLoadTimeMs", true],
    ["hasContactCta", "true"],
    ["name", "   "],
    ["status", "ready"],
  ])("rejects invalid %s proposals without modifying the record", async (field, value) => {
    mocks.findingFindUnique.mockResolvedValue({ ...pendingFinding, field, currentValue: JSON.stringify(prospect[field as keyof typeof prospect] ?? null), proposedValue: JSON.stringify(value) });
    await expect(decideResearchFinding("f1", "approve", "admin")).rejects.toThrow();
    expect(mocks.prospectUpdate).not.toHaveBeenCalled();
    expect(mocks.contactEventCreate).not.toHaveBeenCalled();
  });

  it("rejects an approval without an HTTP evidence source", async () => {
    mocks.findingFindUnique.mockResolvedValue({ ...pendingFinding, sourceUrl: "javascript:alert(1)" });
    await expect(decideResearchFinding("f1", "approve", "admin")).rejects.toThrow("fuente HTTP");
    expect(mocks.prospectUpdate).not.toHaveBeenCalled();
  });

  it("allows dismissing invalid evidence without applying its value", async () => {
    mocks.findingFindUnique.mockResolvedValue({ ...pendingFinding, sourceUrl: "", proposedValue: "null" });
    await decideResearchFinding("f1", "dismiss", "admin");
    expect(mocks.prospectUpdate).not.toHaveBeenCalled();
    expect(mocks.contactEventCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: "research_finding_dismissed" }) }));
  });

  it("requires a reviewer", async () => {
    await expect(decideResearchFinding("f1", "approve", " ")).rejects.toThrow("responsable");
    expect(mocks.findingFindUnique).not.toHaveBeenCalled();
  });
});

describe("research proposal intake", () => {
  it("does not offer invalid values or blocked domains for approval", async () => {
    vi.mocked(researchGooglePlace).mockResolvedValue({ values: [
      { field: "website", value: "https://bit.ly/business", sourceName: "Google Places", sourceUrl: "https://maps.google.com/place", confidence: "high", confidenceReason: "exact match" },
      { field: "rating", value: 99, sourceName: "Google Places", sourceUrl: "https://maps.google.com/place", confidence: "high", confidenceReason: "exact match" },
    ] });
    await runProspectResearch("p1");
    const fields = mocks.findingCreateMany.mock.calls[0][0].data.map((item: { field: string }) => item.field);
    expect(fields).not.toContain("website");
    expect(fields).not.toContain("rating");
    expect(fields).toContain("email");
    expect(mocks.prospectUpdate).not.toHaveBeenCalled();
  });

  it("does not offer the current website again because its tracking parameters differ", async () => {
    vi.mocked(researchGooglePlace).mockResolvedValue({ values: [
      { field: "website", value: "https://tienda.example/?utm_source=google#contact", sourceName: "Google Places", sourceUrl: "https://maps.google.com/place", confidence: "high", confidenceReason: "exact match" },
    ] });
    await runProspectResearch("p1");
    expect(mocks.findingCreateMany.mock.calls[0][0].data.some((item: { field: string }) => item.field === "website")).toBe(false);
  });
});
