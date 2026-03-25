export type SearchCityTarget = {
  slug: string;
  city: string;
  queryLocation: string;
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
  },
  {
    slug: "villahermosa",
    city: "Villahermosa",
    queryLocation: "Villahermosa, Tabasco, Mexico",
  },
  {
    slug: "cdmx",
    city: "Ciudad de Mexico",
    queryLocation: "Ciudad de Mexico, Mexico",
  },
  {
    slug: "guadalajara",
    city: "Guadalajara",
    queryLocation: "Guadalajara, Jalisco, Mexico",
  },
  {
    slug: "puebla",
    city: "Puebla",
    queryLocation: "Puebla, Puebla, Mexico",
  },
  {
    slug: "monterrey",
    city: "Monterrey",
    queryLocation: "Monterrey, Nuevo Leon, Mexico",
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
