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
    slug: "oaxaca",
    city: "Oaxaca",
    queryLocation: "Oaxaca, Oaxaca, Mexico",
    timeZone: "America/Mexico_City",
  },
  {
    slug: "tuxtla-gutierrez",
    city: "Tuxtla Gutierrez",
    queryLocation: "Tuxtla Gutierrez, Chiapas, Mexico",
    timeZone: "America/Mexico_City",
  },
  {
    slug: "veracruz",
    city: "Veracruz",
    queryLocation: "Veracruz, Veracruz, Mexico",
    timeZone: "America/Mexico_City",
  },
  {
    slug: "culiacan",
    city: "Culiacan",
    queryLocation: "Culiacan, Sinaloa, Mexico",
    timeZone: "America/Mexico_City",
  },
  {
    slug: "tepic",
    city: "Tepic",
    queryLocation: "Tepic, Nayarit, Mexico",
    timeZone: "America/Mexico_City",
  },
  {
    slug: "campeche",
    city: "Campeche",
    queryLocation: "Campeche, Campeche, Mexico",
    timeZone: "America/Mexico_City",
  },
  {
    slug: "puebla",
    city: "Puebla",
    queryLocation: "Puebla, Puebla, Mexico",
    timeZone: "America/Mexico_City",
  },
  {
    slug: "leon",
    city: "Leon",
    queryLocation: "Leon, Guanajuato, Mexico",
    timeZone: "America/Mexico_City",
  },
];

export const SEARCH_NICHES: SearchNicheTarget[] = [
  // --- Originales de alto valor ---
  {
    slug: "dentists",
    label: "dentistas",
    textQuery: "dentistas",
    typeLabel: "dentist",
    includedType: "dentist",
  },
  {
    slug: "clinics",
    label: "clinicas medicas",
    textQuery: "clinicas medicas",
    typeLabel: "doctor",
    includedType: "doctor",
  },
  {
    slug: "lawyers",
    label: "despachos de abogados",
    textQuery: "despachos de abogados",
    typeLabel: "lawyer",
    includedType: "lawyer",
  },
  {
    slug: "beauty-salon",
    label: "salones de belleza y esteticas",
    textQuery: "salones de belleza y esteticas",
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
  // --- Servicios locales sin web típicamente ---
  {
    slug: "carpenters",
    label: "carpinteros y ebanistas",
    textQuery: "carpinteros ebanistas",
    typeLabel: "carpenter",
    includedType: "contractor",
  },
  {
    slug: "plumbers",
    label: "plomeros y gasistas",
    textQuery: "plomeros gasistas fontaneros",
    typeLabel: "plumber",
    includedType: "contractor",
  },
  {
    slug: "electricians",
    label: "electricistas residenciales",
    textQuery: "electricistas residenciales",
    typeLabel: "electrician",
    includedType: "contractor",
  },
  {
    slug: "painters",
    label: "pintores y remodeladores",
    textQuery: "pintores remodeladores acabados",
    typeLabel: "painter",
    includedType: "contractor",
  },
  {
    slug: "event-halls",
    label: "salones de eventos y fiestas",
    textQuery: "salones de eventos quinceañeras bodas",
    typeLabel: "event_venue",
    includedType: "event_venue",
  },
  {
    slug: "gyms",
    label: "gimnasios y centros de fitness",
    textQuery: "gimnasios crossfit centros deportivos",
    typeLabel: "gym",
    includedType: "gym",
  },
  {
    slug: "veterinarians",
    label: "veterinarias y clinicas de mascotas",
    textQuery: "veterinarias clinicas veterinarias mascotas",
    typeLabel: "veterinary_care",
    includedType: "veterinary_care",
  },
  {
    slug: "accounting",
    label: "contadores y despachos contables",
    textQuery: "contadores despachos contables fiscalistas",
    typeLabel: "accounting",
    includedType: "accounting",
  },
  {
    slug: "real-estate",
    label: "inmobiliarias y agencias de bienes raices",
    textQuery: "inmobiliarias agencias bienes raices",
    typeLabel: "real_estate_agency",
    includedType: "real_estate_agency",
  },
  {
    slug: "bakeries",
    label: "panaderias y pastelerias",
    textQuery: "panaderias pastelerias artesanales",
    typeLabel: "bakery",
    includedType: "bakery",
  },
];
