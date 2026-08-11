import { describe, expect, it } from "vitest";
import { hasDirectContactPath, scoreProspect } from "@/lib/prospect-scoring";

function makeProspect(overrides: Record<string, unknown> = {}) {
  return {
    website: "https://example.com",
    type: "dentist",
    rating: "4.6",
    userRatingCount: 12,
    websiteFetchFailed: false,
    websiteLoadTimeMs: 1200,
    hasWhatsappCta: false,
    hasContactCta: false,
    isMobileFriendly: true,
    businessStatus: "OPERATIONAL",
    hasRecentPhotos: false,
    photoCount: 3,
    openingHours: { weekdayText: ["Lun-Vie"], isOpen: true },
    email: "",
    phone: "",
    ...overrides,
  };
}

describe("prospect scoring", () => {
  it("detects direct contact paths", () => {
    expect(hasDirectContactPath(makeProspect())).toBe(false);
    expect(hasDirectContactPath(makeProspect({ phone: "9991234567" }))).toBe(true);
    expect(hasDirectContactPath(makeProspect({ hasWhatsappCta: true }))).toBe(true);
  });

  it("prefers contactable prospects", () => {
    const withoutContact = scoreProspect(makeProspect());
    const withPhone = scoreProspect(makeProspect({ phone: "9991234567" }));
    const withWhatsapp = scoreProspect(makeProspect({ hasWhatsappCta: true }));

    expect(withPhone).toBeGreaterThan(withoutContact);
    expect(withWhatsapp).toBeGreaterThan(withoutContact);
  });
});
