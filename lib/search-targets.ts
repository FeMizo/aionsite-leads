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
  {
    slug: "cancun",
    city: "Cancun",
    queryLocation: "Cancun, Quintana Roo, Mexico",
    timeZone: "America/Cancun",
  },
  {
    slug: "queretaro",
    city: "Queretaro",
    queryLocation: "Queretaro, Queretaro, Mexico",
    timeZone: "America/Mexico_City",
  },
  {
    slug: "tijuana",
    city: "Tijuana",
    queryLocation: "Tijuana, Baja California, Mexico",
    timeZone: "America/Tijuana",
  },
  {
    slug: "leon",
    city: "Leon",
    queryLocation: "Leon, Guanajuato, Mexico",
    timeZone: "America/Mexico_City",
  },
  {
    slug: "san-luis-potosi",
    city: "San Luis Potosi",
    queryLocation: "San Luis Potosi, San Luis Potosi, Mexico",
    timeZone: "America/Mexico_City",
  },
  {
    slug: "aguascalientes",
    city: "Aguascalientes",
    queryLocation: "Aguascalientes, Aguascalientes, Mexico",
    timeZone: "America/Mexico_City",
  },
];

export const SEARCH_NICHES: SearchNicheTarget[] = [
  // --- Originales ---
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
    typeLabel: "doctor",
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
    slug: "beauty-salon",
    label: "esteticas y salones de belleza",
    textQuery: "esteticas y salones de belleza",
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
    label: "restaurantes y fondas",
    textQuery: "restaurantes pequeños y fondas",
    typeLabel: "restaurant",
    includedType: "restaurant",
  },
  // --- Nuevos nichos de alto valor ---
  {
    slug: "hotels",
    label: "hoteles y hospedajes",
    textQuery: "hoteles y hospedajes",
    typeLabel: "lodging",
    includedType: "lodging",
  },
  {
    slug: "gyms",
    label: "gimnasios y centros deportivos",
    textQuery: "gimnasios y centros deportivos",
    typeLabel: "gym",
    includedType: "gym",
  },
  {
    slug: "real-estate",
    label: "inmobiliarias y agencias de bienes raices",
    textQuery: "inmobiliarias y agencias de bienes raices",
    typeLabel: "real_estate_agency",
    includedType: "real_estate_agency",
  },
  {
    slug: "veterinaries",
    label: "veterinarias y clinicas veterinarias",
    textQuery: "veterinarias y clinicas veterinarias",
    typeLabel: "veterinary_care",
    includedType: "veterinary_care",
  },
  {
    slug: "schools",
    label: "academias y escuelas de cursos",
    textQuery: "academias y escuelas de cursos privados",
    typeLabel: "school",
    includedType: "school",
  },
  {
    slug: "accounting",
    label: "contadores y despachos contables",
    textQuery: "contadores y despachos contables",
    typeLabel: "accounting",
    includedType: "accounting",
  },
];
