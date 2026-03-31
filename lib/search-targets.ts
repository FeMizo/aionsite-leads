export type SearchCityTarget = {
  slug: string;
  city: string;
  queryLocation: string;
  timeZone: string;
};

export type SearchNicheTarget = {
  slug: string;
  label: string;
  textQuery: string;
  typeLabel?: string;
  includedType?: string;
};

export const SEARCH_CITIES: SearchCityTarget[] = [
  {
    slug: "merida",
    city: "Merida",
    queryLocation: "Merida, Yucatan, Mexico",
    timeZone: "America/Merida",
  },
  {
    slug: "villahermosa",
    city: "Villahermosa",
    queryLocation: "Villahermosa, Tabasco, Mexico",
    timeZone: "America/Mexico_City",
  },
  {
    slug: "cdmx",
    city: "Ciudad de Mexico",
    queryLocation: "Ciudad de Mexico, Mexico",
    timeZone: "America/Mexico_City",
  },
  {
    slug: "guadalajara",
    city: "Guadalajara",
    queryLocation: "Guadalajara, Jalisco, Mexico",
    timeZone: "America/Mexico_City",
  },
  {
    slug: "puebla",
    city: "Puebla",
    queryLocation: "Puebla, Puebla, Mexico",
    timeZone: "America/Mexico_City",
  },
  {
    slug: "monterrey",
    city: "Monterrey",
    queryLocation: "Monterrey, Nuevo Leon, Mexico",
    timeZone: "America/Monterrey",
  },
];

export const SEARCH_NICHES: SearchNicheTarget[] = [
  {
    slug: "dentists",
    label: "dentistas",
    textQuery: "dentistas",
    typeLabel: "dentist",
    includedType: "dentist",
  },
  {
    slug: "clinics",
    label: "clinicas",
    textQuery: "clinicas",
    typeLabel: "clinic",
    includedType: "doctor",
  },
  {
    slug: "lawyers",
    label: "abogados",
    textQuery: "abogados",
    typeLabel: "lawyer",
    includedType: "lawyer",
  },
  {
    slug: "beauty-spa",
    label: "esteticas y spas",
    textQuery: "esteticas y spas",
    typeLabel: "beauty_salon",
    includedType: "beauty_salon",
  },
  {
    slug: "mechanic-shops",
    label: "talleres mecanicos",
    textQuery: "talleres mecanicos",
    typeLabel: "car_repair",
    includedType: "car_repair",
  },
  {
    slug: "small-restaurants",
    label: "restaurantes pequenos",
    textQuery: "restaurantes pequenos",
    typeLabel: "restaurant",
    includedType: "restaurant",
  },
] as const;
