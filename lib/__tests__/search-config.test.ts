import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("search catalog", () => {
  it("exposes default states and query variants", async () => {
    const { SEARCH_CITIES, getSearchStates } = await import("@/lib/search-targets");
    const { SEARCHES } = await import("@/lib/search-config");

    expect(getSearchStates()).toEqual([
      "Campeche",
      "Chiapas",
      "Guanajuato",
      "Nayarit",
      "Oaxaca",
      "Puebla",
      "Sinaloa",
      "Veracruz",
      "Yucatan",
    ]);
    expect(SEARCH_CITIES).toHaveLength(10);
    expect(SEARCHES.some((spec) => spec.id === "dentists-merida-1")).toBe(true);
    expect(SEARCHES.some((spec) => spec.id === "dentists-merida-2")).toBe(true);
  });

  it("loads extra cities and niches from env", async () => {
    vi.stubEnv(
      "SEARCH_CITIES_EXTRA_JSON",
      JSON.stringify([
        {
          slug: "monterrey",
          city: "Monterrey",
          state: "Nuevo Leon",
          queryLocation: "Monterrey, Nuevo Leon, Mexico",
          timeZone: "America/Monterrey",
          aliases: ["Monterrey NL"],
        },
      ])
    );
    vi.stubEnv(
      "SEARCH_NICHES_EXTRA_JSON",
      JSON.stringify([
        {
          slug: "pet-groomers",
          label: "esteticas caninas",
          textQuery: "esteticas caninas",
          typeLabel: "pet_grooming",
          includedType: "pet_grooming",
        },
      ])
    );

    const { SEARCH_CITIES, SEARCH_NICHES, getSearchStates } = await import(
      "@/lib/search-targets"
    );
    const { SEARCHES } = await import("@/lib/search-config");

    expect(SEARCH_CITIES.some((city) => city.slug === "monterrey")).toBe(true);
    expect(SEARCH_NICHES.some((niche) => niche.slug === "pet-groomers")).toBe(true);
    expect(getSearchStates()).toContain("Nuevo Leon");
    expect(SEARCHES.some((spec) => spec.id.startsWith("pet-groomers-monterrey"))).toBe(true);
  });
});
