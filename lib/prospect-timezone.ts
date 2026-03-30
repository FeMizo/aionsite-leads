import { SEARCH_CITIES } from "@/lib/search-targets";

export const DEFAULT_PROSPECT_TIME_ZONE = "America/Mexico_City";

function normalizeLocationKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const SEARCH_CITY_TIME_ZONES = new Map(
  SEARCH_CITIES.map((target) => [normalizeLocationKey(target.city), target.timeZone])
);

const EXTRA_CITY_TIME_ZONES = new Map<string, string>([
  ["merida", "America/Merida"],
  ["merida yucatan", "America/Merida"],
  ["villahermosa", "America/Mexico_City"],
  ["ciudad de mexico", "America/Mexico_City"],
  ["cdmx", "America/Mexico_City"],
  ["mexico city", "America/Mexico_City"],
  ["guadalajara", "America/Mexico_City"],
  ["puebla", "America/Mexico_City"],
  ["monterrey", "America/Monterrey"],
]);

export function getProspectTimeZone(city?: string | null) {
  const normalized = normalizeLocationKey(city || "");

  if (!normalized) {
    return DEFAULT_PROSPECT_TIME_ZONE;
  }

  return (
    SEARCH_CITY_TIME_ZONES.get(normalized) ||
    EXTRA_CITY_TIME_ZONES.get(normalized) ||
    DEFAULT_PROSPECT_TIME_ZONE
  );
}
