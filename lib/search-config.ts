import type { SearchSpec } from "@/lib/types";
import { SEARCH_CITIES } from "@/lib/search-targets";

export const DESIRED_PROSPECT_COUNT = 6;
export const REQUIRED_TYPES: string[] = [];
export const REQUIRE_EMAIL_FOR_FINAL_PROSPECTS = true;

function buildSearchSpec(city: (typeof SEARCH_CITIES)[number]): SearchSpec {
  return {
    id: `businesses-${city.slug}`,
    city: city.city,
    label: `negocios locales en ${city.city}`,
    textQuery: `negocios locales en ${city.queryLocation}`,
    pageSize: 20,
  };
}

export const SEARCHES: SearchSpec[] = SEARCH_CITIES.map((city) => buildSearchSpec(city));
