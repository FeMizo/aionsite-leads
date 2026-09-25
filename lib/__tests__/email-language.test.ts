import { describe, expect, it } from "vitest";
import { buildEmail } from "@/lib/email-template";

const base = {
  name: "Local Business",
  contactName: "",
  city: "Miami",
  languageCode: "en",
  email: "owner@example.com",
  type: "restaurant",
  website: "https://example.com",
  rating: "4.6",
  userRatingCount: 40,
  opportunity: "local visibility",
  recommendedSite: "conversion landing page",
  pitchAngle: "direct enquiries",
};

describe("localized outreach", () => {
  it("generates the first-contact draft in the prospect language", () => {
    const email = buildEmail(base, "a");
    expect(email.subject).toContain("quick growth idea");
    expect(email.text).toContain("I’m Felipe");
    expect(email.text).not.toContain("Soy Felipe");
  });

  it("supports Portuguese and Italian locale codes", () => {
    expect(buildEmail({ ...base, city: "Lisbon", languageCode: "pt-PT" }).text).toContain("Sou Felipe");
    expect(buildEmail({ ...base, city: "Milan", languageCode: "it" }).text).toContain("Sono Felipe");
  });
});
