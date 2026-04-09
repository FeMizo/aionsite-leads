export type SendWindow = {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

export type SendSlot = { hour: number; minute: number };

export type SendConfig = {
  windows: readonly SendWindow[];
  slots: readonly SendSlot[];
};

// Normaliza el primaryType de Google Places a una categoría interna
function resolveCategory(primaryType: string): string {
  const t = primaryType.toLowerCase();

  if (t.includes("dentist") || t.includes("dental")) return "health";
  if (t.includes("doctor") || t.includes("clinic") || t.includes("hospital") || t.includes("physician") || t.includes("medic")) return "health";
  if (t.includes("lawyer") || t.includes("attorney") || t.includes("legal") || t.includes("notary")) return "legal";
  if (t.includes("beauty") || t.includes("hair") || t.includes("salon") || t.includes("spa") || t.includes("nail") || t.includes("barber")) return "beauty";
  if (t.includes("car_repair") || t.includes("mechanic") || t.includes("auto_repair") || t.includes("car_dealer")) return "automotive";
  if (t.includes("restaurant") || t.includes("food") || t.includes("cafe") || t.includes("bakery") || t.includes("bar_and_grill")) return "restaurant";
  if (t.includes("lodging") || t.includes("hotel") || t.includes("motel") || t.includes("hostel") || t.includes("resort")) return "lodging";
  if (t.includes("gym") || t.includes("fitness") || t.includes("sport") || t.includes("yoga") || t.includes("pilates")) return "gym";
  if (t.includes("real_estate") || t.includes("property_management")) return "real_estate";
  if (t.includes("veterinary") || t.includes("animal") || t.includes("pet")) return "veterinary";
  if (t.includes("school") || t.includes("university") || t.includes("college") || t.includes("education") || t.includes("academy") || t.includes("preschool")) return "school";
  if (t.includes("accounting") || t.includes("finance") || t.includes("tax") || t.includes("auditor")) return "accounting";

  return "default";
}

// Ventanas óptimas por categoría de negocio
// La lógica: enviar cuando el dueño/admin tiene tiempo para leer, fuera del pico operativo
const SEND_CONFIGS: Record<string, SendConfig> = {

  // Salud: dentistas, médicos, clínicas
  // Pico: 8:30-13:00 y 16:00-19:00 (back-to-back de pacientes)
  // Óptimo: antes del primer paciente o pausa de comida
  health: {
    windows: [
      { startHour: 7, startMinute: 30, endHour: 8, endMinute: 30 },
      { startHour: 13, startMinute: 30, endHour: 15, endMinute: 0 },
    ],
    slots: [
      { hour: 7, minute: 30 },
      { hour: 8, minute: 0 },
      { hour: 13, minute: 30 },
      { hour: 14, minute: 0 },
      { hour: 14, minute: 30 },
    ],
  },

  // Legales: abogados, notarios
  // Pico: 9:00-14:00 (audiencias/reuniones con clientes), 16:00-18:00
  // Óptimo: primera hora del día o post-comida
  legal: {
    windows: [
      { startHour: 8, startMinute: 0, endHour: 9, endMinute: 0 },
      { startHour: 14, startMinute: 30, endHour: 16, endMinute: 0 },
    ],
    slots: [
      { hour: 8, minute: 0 },
      { hour: 8, minute: 30 },
      { hour: 14, minute: 30 },
      { hour: 15, minute: 0 },
      { hour: 15, minute: 30 },
    ],
  },

  // Belleza: estéticas, salones, spas, barberías
  // Pico: 10:00-13:00 y 16:00-20:00 (clientes todo el día)
  // Óptimo: antes de que arranque el flujo o pausa de las 3pm
  beauty: {
    windows: [
      { startHour: 8, startMinute: 0, endHour: 9, endMinute: 30 },
      { startHour: 14, startMinute: 30, endHour: 15, endMinute: 30 },
    ],
    slots: [
      { hour: 8, minute: 0 },
      { hour: 8, minute: 30 },
      { hour: 9, minute: 0 },
      { hour: 14, minute: 30 },
      { hour: 15, minute: 0 },
    ],
  },

  // Automotriz: talleres mecánicos
  // Pico: 8:00-12:00 (dejan el auto) y 17:00-19:00 (recogen)
  // Óptimo: comida — única pausa real del día
  automotive: {
    windows: [
      { startHour: 12, startMinute: 30, endHour: 14, endMinute: 30 },
    ],
    slots: [
      { hour: 12, minute: 30 },
      { hour: 13, minute: 0 },
      { hour: 13, minute: 30 },
      { hour: 14, minute: 0 },
    ],
  },

  // Restaurantes y fondas
  // Pico: 11:00-15:30 (servicio de comida) y 19:00-21:00 (cena)
  // Óptimo: muy temprano antes del prep, o el hueco entre servicios
  restaurant: {
    windows: [
      { startHour: 8, startMinute: 30, endHour: 10, endMinute: 30 },
      { startHour: 16, startMinute: 0, endHour: 17, endMinute: 30 },
    ],
    slots: [
      { hour: 8, minute: 30 },
      { hour: 9, minute: 0 },
      { hour: 9, minute: 30 },
      { hour: 10, minute: 0 },
      { hour: 16, minute: 0 },
      { hour: 16, minute: 30 },
    ],
  },

  // Hoteles y hospedajes
  // Pico: 6:00-12:00 (check-outs y limpieza) y 14:00-16:00 (check-ins)
  // Óptimo: entre los dos picos o final de tarde
  lodging: {
    windows: [
      { startHour: 10, startMinute: 30, endHour: 13, endMinute: 30 },
      { startHour: 17, startMinute: 0, endHour: 18, endMinute: 30 },
    ],
    slots: [
      { hour: 10, minute: 30 },
      { hour: 11, minute: 0 },
      { hour: 11, minute: 30 },
      { hour: 12, minute: 0 },
      { hour: 12, minute: 30 },
      { hour: 17, minute: 0 },
      { hour: 17, minute: 30 },
    ],
  },

  // Gimnasios y centros deportivos
  // Pico: 6:00-9:30 (mañaneros) y 17:00-21:00 (post-trabajo)
  // Óptimo: piso bajo de actividad a mitad de mañana
  gym: {
    windows: [
      { startHour: 10, startMinute: 0, endHour: 13, endMinute: 0 },
    ],
    slots: [
      { hour: 10, minute: 0 },
      { hour: 10, minute: 30 },
      { hour: 11, minute: 0 },
      { hour: 11, minute: 30 },
      { hour: 12, minute: 0 },
    ],
  },

  // Inmobiliarias
  // Pico: 10:00-14:00 (visitas a propiedades) y 16:00-19:00 (negociaciones)
  // Óptimo: primera hora o pausa breve post-comida
  real_estate: {
    windows: [
      { startHour: 8, startMinute: 0, endHour: 9, endMinute: 30 },
      { startHour: 14, startMinute: 30, endHour: 15, endMinute: 30 },
    ],
    slots: [
      { hour: 8, minute: 0 },
      { hour: 8, minute: 30 },
      { hour: 9, minute: 0 },
      { hour: 14, minute: 30 },
      { hour: 15, minute: 0 },
    ],
  },

  // Veterinarias
  // Pico: 9:00-13:00 (citas mañana) y 16:00-19:00 (citas tarde)
  // Óptimo: antes de abrir fuerte o pausa de comida
  veterinary: {
    windows: [
      { startHour: 8, startMinute: 0, endHour: 9, endMinute: 0 },
      { startHour: 13, startMinute: 30, endHour: 15, endMinute: 30 },
    ],
    slots: [
      { hour: 8, minute: 0 },
      { hour: 8, minute: 30 },
      { hour: 13, minute: 30 },
      { hour: 14, minute: 0 },
      { hour: 14, minute: 30 },
      { hour: 15, minute: 0 },
    ],
  },

  // Academias y escuelas
  // Pico: doble turno 8:00-14:00 y 15:00-20:00
  // Óptimo: muy temprano o el hueco entre turnos (14:00-15:00)
  school: {
    windows: [
      { startHour: 7, startMinute: 0, endHour: 8, endMinute: 0 },
      { startHour: 14, startMinute: 0, endHour: 15, endMinute: 0 },
    ],
    slots: [
      { hour: 7, minute: 0 },
      { hour: 7, minute: 30 },
      { hour: 14, minute: 0 },
      { hour: 14, minute: 30 },
    ],
  },

  // Contadores y despachos contables
  // Pico: 9:00-14:00 (trabajo fiscal/contable) y 16:00-18:00
  // Óptimo: primera hora o post-comida
  accounting: {
    windows: [
      { startHour: 8, startMinute: 0, endHour: 9, endMinute: 0 },
      { startHour: 14, startMinute: 0, endHour: 16, endMinute: 0 },
    ],
    slots: [
      { hour: 8, minute: 0 },
      { hour: 8, minute: 30 },
      { hour: 14, minute: 0 },
      { hour: 14, minute: 30 },
      { hour: 15, minute: 0 },
      { hour: 15, minute: 30 },
    ],
  },

  // Genérico — fallback para tipos no mapeados
  default: {
    windows: [
      { startHour: 8, startMinute: 0, endHour: 10, endMinute: 0 },
      { startHour: 12, startMinute: 30, endHour: 14, endMinute: 0 },
    ],
    slots: [
      { hour: 8, minute: 0 },
      { hour: 8, minute: 30 },
      { hour: 9, minute: 0 },
      { hour: 9, minute: 30 },
      { hour: 10, minute: 0 },
      { hour: 12, minute: 30 },
      { hour: 13, minute: 0 },
      { hour: 13, minute: 30 },
      { hour: 14, minute: 0 },
    ],
  },
};

export function getSendConfig(primaryType: string): SendConfig {
  const category = resolveCategory(primaryType || "");
  return SEND_CONFIGS[category] ?? SEND_CONFIGS.default;
}
