export type SearchCityTarget = {
  slug: string;
  city: string;
  queryLocation: string;
  timeZone: string;
};

export type SearchPlaceTypeTarget = {
  slug: string;
  label: string;
  typeLabel: string;
  includedType: string;
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

export const SEARCH_PLACE_TYPES: SearchPlaceTypeTarget[] = [
  {
    slug: "restaurant",
    label: "restaurante",
    typeLabel: "restaurant",
    includedType: "restaurant",
  },
  {
    slug: "real-estate",
    label: "inmobiliaria",
    typeLabel: "inmobiliaria",
    includedType: "real_estate_agency",
  },
  {
    slug: "clinic",
    label: "clinica",
    typeLabel: "clinica",
    includedType: "doctor",
  },
];
