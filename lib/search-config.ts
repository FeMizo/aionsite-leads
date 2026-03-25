import type { SearchSpec } from "@/lib/types";
import { SEARCH_CITIES, SEARCH_PLACE_TYPES } from "@/lib/search-targets";

export const DESIRED_PROSPECT_COUNT = 6;
export const REQUIRED_TYPES = ["inmobiliaria", "restaurant"];
export const REQUIRE_EMAIL_FOR_FINAL_PROSPECTS = true;

function buildSearchSpec(city: (typeof SEARCH_CITIES)[number], placeType: (typeof SEARCH_PLACE_TYPES)[number]): SearchSpec {
  return {
    id: `${placeType.slug}-${city.slug}`,
    city: city.city,
    label: `${placeType.label} en ${city.city}`,
    textQuery: `${placeType.label} en ${city.queryLocation}`,
    typeLabel: placeType.typeLabel,
    includedType: placeType.includedType,
  };
}

export const SEARCHES: SearchSpec[] = SEARCH_CITIES.flatMap((city) =>
  SEARCH_PLACE_TYPES.map((placeType) => buildSearchSpec(city, placeType))
);
