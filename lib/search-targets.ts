import { getFirstEnvValue } from "@/lib/env";
import { normalizeWhitespace } from "@/lib/normalizers";

export type SearchCityTarget = {
  slug: string;
  city: string;
  state: string;
  queryLocation: string;
  timeZone: string;
  priority?: number;
  aliases?: string[];
  enabled?: boolean;
};

export type SearchNicheTarget = {
  slug: string;
  label: string;
  textQuery: string;
  typeLabel?: string;
  includedType?: string;
  priority?: number;
  queryVariants?: string[];
  pageSize?: number;
  enabled?: boolean;
};

const SEARCH_CITIES_OVERRIDE_ENV = "SEARCH_CITIES_JSON";
const SEARCH_CITIES_EXTRA_ENV = "SEARCH_CITIES_EXTRA_JSON";
const SEARCH_NICHES_OVERRIDE_ENV = "SEARCH_NICHES_JSON";
const SEARCH_NICHES_EXTRA_ENV = "SEARCH_NICHES_EXTRA_JSON";

export const DEFAULT_SEARCH_CITIES: SearchCityTarget[] = [
  {
    slug: "merida",
    city: "Merida",
    state: "Yucatan",
    queryLocation: "Merida, Yucatan, Mexico",
    timeZone: "America/Merida",
    priority: 95,
    aliases: ["Merida Yucatan", "Mérida", "Mérida, Yucatán"],
  },
  {
    slug: "oaxaca",
    city: "Oaxaca",
    state: "Oaxaca",
    queryLocation: "Oaxaca, Oaxaca, Mexico",
    timeZone: "America/Mexico_City",
    priority: 85,
    aliases: ["Oaxaca de Juarez", "Oaxaca de Juárez"],
  },
  {
    slug: "tuxtla-gutierrez",
    city: "Tuxtla Gutierrez",
    state: "Chiapas",
    queryLocation: "Tuxtla Gutierrez, Chiapas, Mexico",
    timeZone: "America/Mexico_City",
    priority: 78,
    aliases: ["Tuxtla", "Tuxtla Gutiérrez"],
  },
  {
    slug: "veracruz",
    city: "Veracruz",
    state: "Veracruz",
    queryLocation: "Veracruz, Veracruz, Mexico",
    timeZone: "America/Mexico_City",
    priority: 82,
    aliases: ["Veracruz puerto", "Veracruz Puerto"],
  },
  {
    slug: "culiacan",
    city: "Culiacan",
    state: "Sinaloa",
    queryLocation: "Culiacan, Sinaloa, Mexico",
    timeZone: "America/Mexico_City",
    priority: 80,
    aliases: ["Culiacan Rosales", "Culiacán"],
  },
  {
    slug: "tepic",
    city: "Tepic",
    state: "Nayarit",
    queryLocation: "Tepic, Nayarit, Mexico",
    timeZone: "America/Mexico_City",
    priority: 74,
    aliases: ["Tepic Nayarit"],
  },
  {
    slug: "campeche",
    city: "Campeche",
    state: "Campeche",
    queryLocation: "Campeche, Campeche, Mexico",
    timeZone: "America/Mexico_City",
    priority: 76,
    aliases: ["San Francisco de Campeche"],
  },
  {
    slug: "ciudad-del-carmen",
    city: "Ciudad del Carmen",
    state: "Campeche",
    queryLocation: "Ciudad del Carmen, Campeche, Mexico",
    timeZone: "America/Mexico_City",
    priority: 79,
    aliases: ["Cd. del Carmen", "Carmen"],
  },
  {
    slug: "puebla",
    city: "Puebla",
    state: "Puebla",
    queryLocation: "Puebla, Puebla, Mexico",
    timeZone: "America/Mexico_City",
    priority: 84,
    aliases: ["Heroica Puebla de Zaragoza"],
  },
  {
    slug: "leon",
    city: "Leon",
    state: "Guanajuato",
    queryLocation: "Leon, Guanajuato, Mexico",
    timeZone: "America/Mexico_City",
    priority: 81,
    aliases: ["León", "Leon de los Aldama"],
  },
  {
    slug: "monterrey",
    city: "Monterrey",
    state: "Nuevo Leon",
    queryLocation: "Monterrey, Nuevo Leon, Mexico",
    timeZone: "America/Monterrey",
    priority: 92,
    aliases: ["Monterrey NL"],
  },
  {
    slug: "guadalajara",
    city: "Guadalajara",
    state: "Jalisco",
    queryLocation: "Guadalajara, Jalisco, Mexico",
    timeZone: "America/Mexico_City",
    priority: 91,
    aliases: ["GDL", "Guadalajara Jalisco"],
  },
  {
    slug: "mexico-city",
    city: "Ciudad de Mexico",
    state: "Ciudad de Mexico",
    queryLocation: "Ciudad de Mexico, Mexico",
    timeZone: "America/Mexico_City",
    priority: 93,
    aliases: ["CDMX", "Ciudad de Mexico"],
  },
  {
    slug: "queretaro",
    city: "Queretaro",
    state: "Queretaro",
    queryLocation: "Queretaro, Queretaro, Mexico",
    timeZone: "America/Mexico_City",
    priority: 88,
    aliases: ["Santiago de Queretaro"],
  },
  {
    slug: "tijuana",
    city: "Tijuana",
    state: "Baja California",
    queryLocation: "Tijuana, Baja California, Mexico",
    timeZone: "America/Tijuana",
    priority: 87,
    aliases: ["Tijuana BC"],
  },
  {
    slug: "cancun",
    city: "Cancun",
    state: "Quintana Roo",
    queryLocation: "Cancun, Quintana Roo, Mexico",
    timeZone: "America/Cancun",
    priority: 86,
    aliases: ["Cancun QR", "Cancun Quintana Roo"],
  },
  {
    slug: "aguascalientes",
    city: "Aguascalientes",
    state: "Aguascalientes",
    queryLocation: "Aguascalientes, Aguascalientes, Mexico",
    timeZone: "America/Mexico_City",
    priority: 84,
    aliases: ["Ags"],
  },
  {
    slug: "san-luis-potosi",
    city: "San Luis Potosi",
    state: "San Luis Potosi",
    queryLocation: "San Luis Potosi, San Luis Potosi, Mexico",
    timeZone: "America/Mexico_City",
    priority: 83,
    aliases: ["SLP"],
  },
  {
    slug: "morelia",
    city: "Morelia",
    state: "Michoacan",
    queryLocation: "Morelia, Michoacan, Mexico",
    timeZone: "America/Mexico_City",
    priority: 82,
    aliases: ["Morelia Michoacan"],
  },
  {
    slug: "chihuahua",
    city: "Chihuahua",
    state: "Chihuahua",
    queryLocation: "Chihuahua, Chihuahua, Mexico",
    timeZone: "America/Chihuahua",
    priority: 80,
    aliases: ["Chihuahua CHH"],
  },
];

export const DEFAULT_SEARCH_NICHES: SearchNicheTarget[] = [
  {
    slug: "dentists",
    label: "dentistas",
    textQuery: "dentistas",
    typeLabel: "dentist",
    includedType: "dentist",
    priority: 100,
    queryVariants: ["dentistas", "clinica dental"],
  },
  {
    slug: "clinics",
    label: "clinicas medicas",
    textQuery: "clinicas medicas",
    typeLabel: "doctor",
    includedType: "doctor",
    priority: 94,
    queryVariants: ["clinicas medicas", "consultorio medico"],
  },
  {
    slug: "lawyers",
    label: "despachos de abogados",
    textQuery: "despachos de abogados",
    typeLabel: "lawyer",
    includedType: "lawyer",
    priority: 92,
    queryVariants: ["despachos de abogados", "bufete juridico"],
  },
  {
    slug: "beauty-salon",
    label: "salones de belleza y esteticas",
    textQuery: "salones de belleza y esteticas",
    typeLabel: "beauty_salon",
    includedType: "beauty_salon",
    priority: 88,
    queryVariants: ["salones de belleza", "estetica"],
  },
  {
    slug: "mechanic-shops",
    label: "talleres mecanicos",
    textQuery: "talleres mecanicos",
    typeLabel: "car_repair",
    includedType: "car_repair",
    priority: 90,
    queryVariants: ["talleres mecanicos", "servicio automotriz"],
  },
  {
    slug: "small-restaurants",
    label: "restaurantes y fondas",
    textQuery: "restaurantes pequenos y fondas",
    typeLabel: "restaurant",
    includedType: "restaurant",
    priority: 72,
    queryVariants: ["restaurantes pequenos", "fondas"],
  },
  {
    slug: "carpenters",
    label: "carpinteros y ebanistas",
    textQuery: "carpinteros ebanistas",
    typeLabel: "carpenter",
    includedType: "contractor",
    priority: 86,
  },
  {
    slug: "plumbers",
    label: "plomeros y gasistas",
    textQuery: "plomeros gasistas fontaneros",
    typeLabel: "plumber",
    includedType: "contractor",
    priority: 87,
  },
  {
    slug: "electricians",
    label: "electricistas residenciales",
    textQuery: "electricistas residenciales",
    typeLabel: "electrician",
    includedType: "contractor",
    priority: 89,
  },
  {
    slug: "painters",
    label: "pintores y remodeladores",
    textQuery: "pintores remodeladores acabados",
    typeLabel: "painter",
    includedType: "contractor",
    priority: 83,
  },
  {
    slug: "event-halls",
    label: "salones de eventos y fiestas",
    textQuery: "salones de eventos quinceaneras bodas",
    typeLabel: "event_venue",
    includedType: "event_venue",
    priority: 75,
  },
  {
    slug: "gyms",
    label: "gimnasios y centros de fitness",
    textQuery: "gimnasios crossfit centros deportivos",
    typeLabel: "gym",
    includedType: "gym",
    priority: 79,
  },
  {
    slug: "veterinarians",
    label: "veterinarias y clinicas de mascotas",
    textQuery: "veterinarias clinicas veterinarias mascotas",
    typeLabel: "veterinary_care",
    includedType: "veterinary_care",
    priority: 91,
  },
  {
    slug: "accounting",
    label: "contadores y despachos contables",
    textQuery: "contadores despachos contables fiscalistas",
    typeLabel: "accounting",
    includedType: "accounting",
    priority: 96,
  },
  {
    slug: "real-estate",
    label: "inmobiliarias y agencias de bienes raices",
    textQuery: "inmobiliarias agencias bienes raices",
    typeLabel: "real_estate_agency",
    includedType: "real_estate_agency",
    priority: 93,
  },
  {
    slug: "bakeries",
    label: "panaderias y pastelerias",
    textQuery: "panaderias pastelerias artesanales",
    typeLabel: "bakery",
    includedType: "bakery",
    priority: 77,
  },
];

function normalizeKey(value: string) {
  return normalizeWhitespace(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value: string) {
  return normalizeWhitespace(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function parseJsonArrayEnv<T>(value: string, label: string) {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      throw new Error(`${label} debe ser un arreglo JSON.`);
    }

    return parsed as T[];
  } catch (error) {
    console.warn(
      error instanceof Error
        ? `[search-targets] Ignorando ${label}: ${error.message}`
        : `[search-targets] Ignorando ${label} por un JSON invalido.`
    );

    return [];
  }
}

function normalizeSearchCityTarget(entry: Partial<SearchCityTarget>): SearchCityTarget | null {
  const slug = normalizeKey(String(entry.slug || ""));
  const city = normalizeText(String(entry.city || ""));
  const state = normalizeText(String(entry.state || ""));
  const queryLocation = normalizeText(String(entry.queryLocation || ""));
  const timeZone = normalizeWhitespace(String(entry.timeZone || ""));

  if (!slug || !city || !state || !queryLocation || !timeZone) {
    return null;
  }

  const aliases = Array.isArray(entry.aliases)
    ? entry.aliases.map((alias) => normalizeText(String(alias))).filter(Boolean)
    : [];

  return {
    slug,
    city,
    state,
    queryLocation,
    timeZone,
    aliases: aliases.length ? aliases : undefined,
    enabled: entry.enabled !== false,
  };
}

function normalizeSearchNicheTarget(entry: Partial<SearchNicheTarget>): SearchNicheTarget | null {
  const slug = normalizeKey(String(entry.slug || ""));
  const label = normalizeText(String(entry.label || ""));
  const textQuery = normalizeText(String(entry.textQuery || ""));

  if (!slug || !label || !textQuery) {
    return null;
  }

  const queryVariants = Array.isArray(entry.queryVariants)
    ? entry.queryVariants
        .map((variant) => normalizeText(String(variant)))
        .filter(Boolean)
    : [];

  return {
    slug,
    label,
    textQuery,
    typeLabel: normalizeText(String(entry.typeLabel || "")) || undefined,
    includedType: normalizeText(String(entry.includedType || "")) || undefined,
    queryVariants: queryVariants.length ? Array.from(new Set(queryVariants)) : undefined,
    pageSize: Number.isFinite(Number(entry.pageSize))
      ? Math.min(Math.max(Math.trunc(Number(entry.pageSize)), 1), 50)
      : undefined,
    enabled: entry.enabled !== false,
  };
}

function mergeSearchTargets<T extends { slug: string; enabled?: boolean }>(
  defaults: T[],
  overrides: T[],
  extras: T[]
) {
  const merged = new Map<string, T>();

  for (const entry of defaults) {
    merged.set(entry.slug, entry);
  }

  for (const entry of overrides) {
    merged.set(entry.slug, entry);
  }

  for (const entry of extras) {
    if (merged.has(entry.slug)) {
      merged.set(entry.slug, {
        ...merged.get(entry.slug)!,
        ...entry,
      });
      continue;
    }

    merged.set(entry.slug, entry);
  }

  return Array.from(merged.values()).filter((entry) => entry.enabled !== false);
}

function loadSearchCities() {
  const overridesRaw = getFirstEnvValue([SEARCH_CITIES_OVERRIDE_ENV]);
  const extrasRaw = getFirstEnvValue([SEARCH_CITIES_EXTRA_ENV]);

  const overrides = overridesRaw
    ? parseJsonArrayEnv<Partial<SearchCityTarget>>(overridesRaw, SEARCH_CITIES_OVERRIDE_ENV)
        .map(normalizeSearchCityTarget)
        .filter((target): target is SearchCityTarget => Boolean(target))
    : [];

  const extras = extrasRaw
    ? parseJsonArrayEnv<Partial<SearchCityTarget>>(extrasRaw, SEARCH_CITIES_EXTRA_ENV)
        .map(normalizeSearchCityTarget)
        .filter((target): target is SearchCityTarget => Boolean(target))
    : [];

  const base = overrides.length ? overrides : DEFAULT_SEARCH_CITIES;
  return mergeSearchTargets(base, [], extras);
}

function loadSearchNiches() {
  const overridesRaw = getFirstEnvValue([SEARCH_NICHES_OVERRIDE_ENV]);
  const extrasRaw = getFirstEnvValue([SEARCH_NICHES_EXTRA_ENV]);

  const overrides = overridesRaw
    ? parseJsonArrayEnv<Partial<SearchNicheTarget>>(overridesRaw, SEARCH_NICHES_OVERRIDE_ENV)
        .map(normalizeSearchNicheTarget)
        .filter((target): target is SearchNicheTarget => Boolean(target))
    : [];

  const extras = extrasRaw
    ? parseJsonArrayEnv<Partial<SearchNicheTarget>>(extrasRaw, SEARCH_NICHES_EXTRA_ENV)
        .map(normalizeSearchNicheTarget)
        .filter((target): target is SearchNicheTarget => Boolean(target))
    : [];

  const base = overrides.length ? overrides : DEFAULT_SEARCH_NICHES;
  return mergeSearchTargets(base, [], extras);
}

export const SEARCH_CITIES = loadSearchCities();
export const SEARCH_NICHES = loadSearchNiches();

export function getSearchCities() {
  return SEARCH_CITIES;
}

export function getSearchNiches() {
  return SEARCH_NICHES;
}

export function getSearchStates() {
  return Array.from(new Set(SEARCH_CITIES.map((target) => target.state))).sort((left, right) =>
    left.localeCompare(right, "es")
  );
}
