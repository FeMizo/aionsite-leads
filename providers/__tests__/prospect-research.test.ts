import { afterEach, describe, expect, it, vi } from "vitest";
import { researchGooglePlace, researchBraveSocialProfile } from "@/providers/prospect-research";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("research providers", () => {
  it("requires an existing Places credential", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    await expect(researchGooglePlace({ name: "Tienda Centro", city: "Mérida", type: "Tienda", website: "" }))
      .resolves.toMatchObject({ values: [], error: "Google Places no está configurado." });
  });

  it("only returns a Places result with exact name and city", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ places: [
      { displayName: { text: "Tienda Centro" }, formattedAddress: "Calle 10, Mérida, Yucatán, México", nationalPhoneNumber: "9991234567", rating: 4.8, userRatingCount: 22 },
    ] }), { status: 200 })));
    const result = await researchGooglePlace({ name: "Tienda Centro", city: "Mérida", type: "Tienda", website: "" });
    expect(result.values.map((item) => item.field)).toContain("userRatingCount");
    expect(result.values[0].confidence).toBe("high");
  });

  it("rejects a same-name Places result in another city", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ places: [
      { displayName: { text: "Tienda Centro" }, formattedAddress: "Centro, Oaxaca, México" },
    ] }), { status: 200 })));
    const result = await researchGooglePlace({ name: "Tienda Centro", city: "Mérida", type: "Tienda", website: "" });
    expect(result.values).toEqual([]);
    expect(result.error).toContain("Coincidencia ambigua");
  });

  it("only proposes an exact-name social profile from an allowed domain", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ web: { results: [{ title: "Tienda Centro - Facebook", url: "https://www.facebook.com/tiendacentro" }] } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ web: { results: [] } }), { status: 200 })));
    const result = await researchBraveSocialProfile({ name: "Tienda Centro", city: "Mérida", type: "Tienda", website: "" });
    expect(result.values).toEqual([expect.objectContaining({ field: "website", sourceName: "Brave Search", confidence: "medium" })]);
  });
});
