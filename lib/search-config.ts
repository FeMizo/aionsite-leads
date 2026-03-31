import type { SearchSpec } from "@/lib/types";
import { SEARCH_CITIES, SEARCH_NICHES } from "@/lib/search-targets";

export const DESIRED_PROSPECT_COUNT = 6;
export const REQUIRED_TYPES: string[] = [];
export const REQUIRE_EMAIL_FOR_FINAL_PROSPECTS = true;

function buildSearchSpec(
  city: (typeof SEARCH_CITIES)[number],
  niche: (typeof SEARCH_NICHES)[number]
): SearchSpec {
  return {
    id: `${niche.slug}-${city.slug}`,
    city: city.city,
    label: `${niche.label} en ${city.city}`,
    textQuery: `${niche.textQuery} en ${city.queryLocation}`,
    typeLabel: niche.typeLabel,
    includedType: niche.includedType,
    pageSize: 20,
  };
}

export const SEARCHES: SearchSpec[] = SEARCH_CITIES.flatMap((city) =>
  SEARCH_NICHES.map((niche) => buildSearchSpec(city, niche))
);
