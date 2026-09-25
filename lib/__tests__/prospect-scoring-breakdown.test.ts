import { describe, expect, it } from "vitest";
import { getProspectScoreBreakdown } from "@/lib/prospect-scoring";

describe("prospect scoring breakdown", () => {
  it("separates fit, urgency, contactability, and activity", () => {
    const breakdown = getProspectScoreBreakdown({
      type: "sin-website",
      website: "",
      rating: "4.2",
      userRatingCount: 40,
      phone: "+52 999 123 4567",
      email: "hola@negocio.mx",
      businessStatus: "OPERATIONAL",
      hasRecentPhotos: true,
      openingHours: { weekdayText: ["Lunes: 9:00 - 18:00"], isOpen: true },
      hasWhatsappCta: false,
      hasContactCta: false,
      isMobileFriendly: null,
    });

    expect(breakdown.fit).toBeGreaterThan(0);
    expect(breakdown.urgency).toBeGreaterThan(0);
    expect(breakdown.contactability).toBeGreaterThan(0);
    expect(breakdown.activity).toBeGreaterThan(0);
    expect(breakdown.total).toBe(
      breakdown.fit + breakdown.urgency + breakdown.contactability + breakdown.activity
    );
  });
});
