import type { SearchSpec } from "@/lib/types";

export const DESIRED_PROSPECT_COUNT = 6;
export const REQUIRED_TYPES = ["Inmobiliaria", "Restaurante"];
export const REQUIRE_EMAIL_FOR_FINAL_PROSPECTS = true;

export const SEARCHES: SearchSpec[] = [
  {
    id: "restaurant-merida",
    city: "Merida",
    label: "restaurante en Merida",
    textQuery: "restaurante en Merida, Yucatan, Mexico",
    typeLabel: "Restaurante",
    includedType: "restaurant",
  },
  {
    id: "real-estate-merida",
    city: "Merida",
    label: "inmobiliaria en Merida",
    textQuery: "inmobiliaria en Merida, Yucatan, Mexico",
    typeLabel: "Inmobiliaria",
    includedType: "real_estate_agency",
  },
  {
    id: "clinic-merida",
    city: "Merida",
    label: "clinica en Merida",
    textQuery: "clinica en Merida, Yucatan, Mexico",
    typeLabel: "Clinica",
    includedType: "doctor",
  },
  {
    id: "restaurant-villahermosa",
    city: "Villahermosa",
    label: "restaurante en Villahermosa",
    textQuery: "restaurante en Villahermosa, Tabasco, Mexico",
    typeLabel: "Restaurante",
    includedType: "restaurant",
  },
  {
    id: "real-estate-villahermosa",
    city: "Villahermosa",
    label: "inmobiliaria en Villahermosa",
    textQuery: "inmobiliaria en Villahermosa, Tabasco, Mexico",
    typeLabel: "Inmobiliaria",
    includedType: "real_estate_agency",
  },
  {
    id: "restaurant-cdmx",
    city: "Ciudad de Mexico",
    label: "restaurante en Ciudad de Mexico",
    textQuery: "restaurante en Ciudad de Mexico, Mexico",
    typeLabel: "Restaurante",
    includedType: "restaurant",
  },
  {
    id: "real-estate-cdmx",
    city: "Ciudad de Mexico",
    label: "inmobiliaria en Ciudad de Mexico",
    textQuery: "inmobiliaria en Ciudad de Mexico, Mexico",
    typeLabel: "Inmobiliaria",
    includedType: "real_estate_agency",
  },
];
