export type SearchCityTarget = {
  slug: string;
  city: string;
  queryLocation: string;
  timeZone: string;
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
