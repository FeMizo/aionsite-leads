import type { SearchSpec } from "@/lib/types";
import { SEARCH_CITIES, SEARCH_NICHES } from "@/lib/search-targets";

export const DESIRED_PROSPECT_COUNT = 20;
export const REQUIRED_TYPES: string[] = [];
export const REQUIRE_EMAIL_FOR_FINAL_PROSPECTS = true;
export const MAX_SEARCHES_PER_RUN = Number.isFinite(
  Number(process.env.MAX_SEARCHES_PER_RUN)
)
  ? Math.max(1, Math.floor(Number(process.env.MAX_SEARCHES_PER_RUN)))
  : 80;

function buildSearchSpecs(
  city: (typeof SEARCH_CITIES)[number],
  niche: (typeof SEARCH_NICHES)[number]
): SearchSpec[] {
  const queries = Array.from(
    new Set([
      niche.textQuery,
      ...(niche.queryVariants || []),
    ])
  );

  return queries.map((query, index) => ({
    id: `${niche.slug}-${city.slug}${queries.length > 1 ? `-${index + 1}` : ""}`,
    city: city.city,
    state: city.state,
    label: `${niche.label} en ${city.city}${queries.length > 1 ? ` (${index + 1})` : ""}`,
    textQuery: `${query} en ${city.queryLocation}`,
    queryVariant: query,
    potentialScore: (city.priority ?? 50) + (niche.priority ?? 50),
    typeLabel: niche.typeLabel,
    includedType: niche.includedType,
    pageSize: niche.pageSize ?? 20,
  }));
}

export const SEARCHES: SearchSpec[] = SEARCH_CITIES.flatMap((city) =>
  SEARCH_NICHES.flatMap((niche) => buildSearchSpecs(city, niche))
).sort((left, right) => {
  const leftScore = left.potentialScore ?? 0;
  const rightScore = right.potentialScore ?? 0;

  return rightScore - leftScore || left.id.localeCompare(right.id);
});

export const SEARCHES_FOR_RUN = SEARCHES.slice(0, MAX_SEARCHES_PER_RUN);
