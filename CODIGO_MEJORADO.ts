/**
 * CÓDIGO MEJORADO PARA IMPLEMENTACIÓN
 * Reemplaza/extiende los archivos actuales
 *
 * Archivos a modificar:
 * 1. lib/types.ts (ProspectCandidate)
 * 2. lib/providers/google-places.ts (fieldMask + mapping)
 * 3. lib/prospect-scoring.ts (nuevas señales)
 * 4. lib/pipeline.ts (filtrado de operacionales)
 */

// ============================================================================
// 1️⃣ TYPES.TS - Agregar nuevos campos a ProspectCandidate
// ============================================================================

export type OpeningHours = {
  weekdayText: string[]; // ["Monday: 8:00 – 18:00", ...]
  isOpen: boolean | null;
};

export type ProspectCandidate = {
  // ✅ EXISTENTES (no cambiar orden)
  name: string;
  contactName: string;
  city: string;
  email: string;
  phone: string;
  type: string;
  website: string;
  rating: string;
  userRatingCount: number | null;
  mapsUrl: string;
  opportunity: string;
  recommendedSite: string;
  pitchAngle: string;
  status: "generated" | "analyzed" | "approved" | "ready" | "contacted" | "replied" | "closed" | "rejected";
  source: string;
  createdAt: string;
  lastCheckedAt: string;
  businessStatus: string;
  placeId: string;
  formattedAddress: string;
  primaryType: string;

  // 🆕 NUEVOS - Para signals de actividad
  businessStatus: "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY" | "UNKNOWN";
  hasRecentPhotos: boolean; // ¿Fotos en últimos 90 días?
  mostRecentPhotoDate: string | null; // ISO string
  photoCount: number; // Cuántas fotos tiene el negocio
  hasCompleteHours: boolean; // ¿Tiene horarios definidos?
  openingHours: OpeningHours | null; // Horarios + estado actual
  businessTypes: string[]; // [restaurant, bar, lunch_spot, etc]
};

// ============================================================================
// 2️⃣ GOOGLE-PLACES.TS - Mejorado
// ============================================================================

// 📌 PASO 1: Actualizar fieldMask
const DEFAULT_FIELD_MASK = [
  // --- EXISTENTES ---
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
  "places.primaryType",
  "places.googleMapsUri",
  "places.businessStatus",

  // --- 🆕 NUEVOS ---
  "places.photos",           // Array de fotos con fecha
  "places.openingHours",     // Horarios + estado actual
  "places.types",            // Todos los tipos (no solo primary)
].join(",");

// 📌 PASO 2: Actualizar tipo GooglePlace para incluir nuevos campos
type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  googleMapsUri?: string;
  businessStatus?: string;

  // 🆕 NUEVOS
  photos?: Array<{
    name: string;
    heightPx?: number;
    widthPx?: number;
    authorAttributions?: Array<{
      displayName?: string;
      uri?: string;
      photoUri?: string;
      publishTime?: string; // ISO datetime
    }>;
  }>;
  openingHours?: {
    openNow?: boolean;
    periods?: Array<{
      open?: { day?: number; hour?: number; minute?: number };
      close?: { day?: number; hour?: number; minute?: number };
    }>;
    weekdayDescriptions?: string[]; // ["Monday: 8:00 – 18:00", ...]
  };
  types?: string[]; // [restaurant, bar, meal_takeaway, etc]
};

// 📌 PASO 3: Funciones auxiliares para procesar fotos y horarios
function extractPhotoSignals(photos?: GooglePlace["photos"]) {
  if (!photos || photos.length === 0) {
    return {
      photoCount: 0,
      hasRecentPhotos: false,
      mostRecentPhotoDate: null,
    };
  }

  // Intentar extraer fechas de attributions
  const dates: Date[] = [];

  for (const photo of photos) {
    if (photo.authorAttributions) {
      for (const attr of photo.authorAttributions) {
        // Algunos tienen 'publishTime', otros 'date'
        const dateStr = attr.publishTime || attr.uri;
        if (dateStr && !dateStr.includes("://")) {
          // Si es ISO string, parsear
          try {
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
              dates.push(parsed);
            }
          } catch (e) {
            // Ignorar fechas inválidas
          }
        }
      }
    }
  }

  // Si no hay fechas, asumir que son recientes (Google los indexó)
  if (dates.length === 0) {
    return {
      photoCount: photos.length,
      hasRecentPhotos: true, // 👈 Asumir recientes si están en Google
      mostRecentPhotoDate: null,
    };
  }

  // Ordenar por más reciente
  dates.sort((a, b) => b.getTime() - a.getTime());
  const mostRecent = dates[0];

  // Calcular días desde la foto más reciente
  const daysSince = Math.floor(
    (Date.now() - mostRecent.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    photoCount: photos.length,
    hasRecentPhotos: daysSince <= 90, // ✅ Considerar reciente si < 90 días
    mostRecentPhotoDate: mostRecent.toISOString(),
  };
}

function extractHourSignals(openingHours?: GooglePlace["openingHours"]) {
  if (!openingHours) return null;

  return {
    weekdayText: openingHours.weekdayDescriptions || [],
    isOpen: openingHours.openNow ?? null,
  };
}

// 📌 PASO 4: Actualizar mapGooglePlaceToProspect
function mapGooglePlaceToProspect(
  place: GooglePlace,
  search: SearchSpec
): ProspectCandidate {
  const photoSignals = extractPhotoSignals(place.photos);
  const hourSignals = extractHourSignals(place.openingHours);

  return {
    // ✅ EXISTENTES
    name: place.displayName?.text || "",
    contactName: "",
    city: search.city,
    email: "",
    phone: place.nationalPhoneNumber || "",
    type: search.typeLabel?.toLowerCase() || place.primaryType || "negocio_local",
    website: place.websiteUri || "",
    rating: place.rating ? String(place.rating) : "",
    userRatingCount: place.userRatingCount ?? null,
    mapsUrl: place.googleMapsUri || "",
    opportunity: "",
    recommendedSite: "",
    pitchAngle: "",
    status: "generated",
    source: "google-places",
    createdAt: "",
    lastCheckedAt: "",
    businessStatus: place.businessStatus || "UNKNOWN",
    placeId: place.id || "",
    formattedAddress: place.formattedAddress || "",
    primaryType: place.primaryType || "",

    // 🆕 NUEVOS
    hasRecentPhotos: photoSignals.hasRecentPhotos,
    mostRecentPhotoDate: photoSignals.mostRecentPhotoDate,
    photoCount: photoSignals.photoCount,
    hasCompleteHours: Boolean(hourSignals?.weekdayText?.length),
    openingHours: hourSignals,
    businessTypes: place.types || [],
  };
}

// ============================================================================
// 3️⃣ PROSPECT-SCORING.TS - Mejorado
// ============================================================================

// 📌 NUEVO: Detectar si negocio está activo
export function isBusinessActive(prospect: Pick<
  ProspectScoreInput,
  "businessStatus" | "hasRecentPhotos" | "openingHours" | "userRatingCount" | "photoCount"
>): boolean {
  // ❌ Cerrado = NO está activo
  if (prospect.businessStatus === "CLOSED_PERMANENTLY") return false;
  if (prospect.businessStatus === "CLOSED_TEMPORARILY") return false;

  // ✅ Señales de actividad
  const hasRecentPhotos = prospect.hasRecentPhotos === true;
  const hasHours = Boolean(prospect.openingHours);
  const hasReviews = prospect.userRatingCount && prospect.userRatingCount > 5;
  const hasPhotos = prospect.photoCount && prospect.photoCount > 0;

  // Activo = operacional + al menos 1 señal
  return (
    prospect.businessStatus === "OPERATIONAL" &&
    (hasRecentPhotos || hasHours || hasReviews || hasPhotos)
  );
}

// 📌 Actualizar ProspectScoreInput type
type ProspectScoreInput = Pick<
  ProspectCandidate,
  | "website"
  | "type"
  | "rating"
  | "userRatingCount"
  | "websiteFetchFailed"
  | "websiteLoadTimeMs"
  | "hasWhatsappCta"
  | "hasContactCta"
  | "isMobileFriendly"
  | "businessStatus"     // 🆕
  | "hasRecentPhotos"    // 🆕
  | "photoCount"         // 🆕
  | "openingHours"       // 🆕
  | "mostRecentPhotoDate" // 🆕
>;

// 📌 Mejorar scoreProspect()
export function scoreProspect(prospect: ProspectScoreInput): number {
  const websiteSignal = inferWebsiteSignal(prospect);
  const reviewCount = parseReviewCount(prospect.userRatingCount);
  const rating = parseRating(prospect.rating || "");
  let score = 0;

  // ✅ SCORING EXISTENTE (sin cambios)
  // 1. ESTADO DEL SITIO WEB
  if (websiteSignal === "missing") {
    score += 40;
  } else if (websiteSignal === "social-only") {
    score += 30;
  } else if (websiteSignal === "basic") {
    score += 24;
  } else if (prospect.websiteFetchFailed) {
    score += 20;
  } else if (typeof prospect.websiteLoadTimeMs === "number") {
    if (prospect.websiteLoadTimeMs >= 6000) {
      score += 16;
    } else if (prospect.websiteLoadTimeMs >= 4500) {
      score += 10;
    }
  }

  // 2. SEÑALES DE CONVERSION
  if (lacksContactCta(prospect)) {
    score += 12;
  }
  if (prospect.isMobileFriendly === false) {
    score += 10;
  }

  // 3. TRACCION DEL NEGOCIO (reviews)
  if (reviewCount >= 50) {
    score += 15;
  } else if (reviewCount >= 15) {
    score += 8;
  }

  // 4. RATING
  if (hasRatingOpportunity(prospect)) {
    score += 20;
  }

  // 🆕 NUEVAS SEÑALES DE ACTIVIDAD
  // 5. BUSINESS STATUS
  if (prospect.businessStatus === "OPERATIONAL") {
    score += 5; // ✅ Confirmado abierto
  }

  // 6. FOTOS RECIENTES (muy importante)
  if (prospect.hasRecentPhotos === true) {
    score += 15; // 📸 Fotos recientes = negocio muy activo
  } else if (prospect.photoCount && prospect.photoCount > 0) {
    score += 5; // Tiene fotos pero no sabemos edad
  }

  // 7. HORARIOS COMPLETOS
  if (prospect.openingHours?.weekdayText?.length > 0) {
    score += 5; // ⏰ Profesional
  }

  // 8. PENALIZAR NEGOCIOS SIN SEÑALES (posible abandono)
  const lacksSignals =
    !prospect.hasRecentPhotos &&
    !prospect.openingHours &&
    !reviewCount;

  if (lacksSignals) {
    score -= 10; // ⚠️ Podría estar abandonado
  }

  // ✅ Resto del código existente
  if (
    score === 0 &&
    !hasStoredAuditSnapshot(prospect) &&
    (websiteSignal === "existing" || rating !== null)
  ) {
    return INCOMPLETE_AUDIT_BASELINE_SCORE;
  }

  return Math.max(0, score);
}

// 📌 NUEVAS CONSTANTES
export const MINIMUM_SAVE_SCORE = 35;
export const MINIMUM_QUALIFIED_PROSPECT_SCORE = 50;
export const AUTO_READY_PROSPECT_SCORE = 75;
export const WHATSAPP_AUTO_SEND_SCORE = 80; // 🆕 Para WhatsApp automatizado

// 📌 Mejorar getPriority() para considerar actividad
export function getPriority(
  score: number,
  isActive: boolean = true
): ProspectPriority {
  // Si no está activo, máximo prioridad baja
  if (!isActive) {
    return "bajo";
  }

  if (score >= 80) {
    return "alto";
  }

  if (score >= MINIMUM_QUALIFIED_PROSPECT_SCORE) {
    return "medio";
  }

  return "bajo";
}

// ============================================================================
// 4️⃣ PIPELINE.TS - Agregar filtrado de cerrados
// ============================================================================

/**
 * Filtrar candidatos: descartar negocios cerrados permanentemente
 * Usar en searchBusinesses() después de extraer candidatos
 */
export function filterActiveCandidates(
  candidates: ProspectCandidate[]
): ProspectCandidate[] {
  const original = candidates.length;

  const filtered = candidates.filter((prospect) => {
    // ❌ DESCARTAR: Cerrado permanentemente
    if (prospect.businessStatus === "CLOSED_PERMANENTLY") {
      console.debug(
        `[pipeline] Descartando ${prospect.name}: CERRADO PERMANENTEMENTE`
      );
      return false;
    }

    // ⚠️ MANTENER: Cerrado temporalmente (para revisitar después)
    if (prospect.businessStatus === "CLOSED_TEMPORARILY") {
      console.warn(
        `[pipeline] ${prospect.name} está CERRADO TEMPORALMENTE (mantener para luego)`
      );
      return true;
    }

    // ✅ MANTENER: Operacional o desconocido
    return true;
  });

  const removed = original - filtered.length;
  if (removed > 0) {
    console.log(
      `[pipeline] Filtrado: ${removed}/${original} negocios cerrados`
    );
  }

  return filtered;
}

// ============================================================================
// 5️⃣ SEARCH-CONFIG.TS - Agregar opciones de filtrado
// ============================================================================

export type SearchSpec = {
  id: string;
  city: string;
  label: string;
  textQuery: string;
  typeLabel?: string;
  includedType?: string;
  pageSize?: number;

  // 🆕 Opciones de filtrado
  excludeStatuses?: Array<"CLOSED_PERMANENTLY" | "CLOSED_TEMPORARILY">;
  minPhotoAge?: number; // Días (ej: 90 = fotos en últimos 90 días)
};

// En buildSearchSpec():
function buildSearchSpec(
  city: (typeof SEARCH_CITIES)[number],
  niche: (typeof SEARCH_NICHES)[number]
): SearchSpec {
  return {
    id: `${niche.slug}-${city.slug}`,
    city: city.city,
    label: `${niche.label} en ${city.city}`,
    textQuery: `${niche.textQuery} en ${city.queryLocation}`,
    typeLabel: niche.typeLabel,
    includedType: niche.includedType,
    pageSize: 20,

    // 🆕 Filtros predeterminados
    excludeStatuses: ["CLOSED_PERMANENTLY"],
    minPhotoAge: 90, // Preferir activos (fotos recientes)
  };
}

// ============================================================================
// 📊 TESTING: Script para verificar mejoras
// ============================================================================

/**
 * Ejecutar después de implementar cambios:
 *
 * 1. npm run db:push (actualizar schema si cambió)
 * 2. npm run dev
 * 3. POST /api/runs/execute (trigger manual)
 * 4. Verificar en Prisma Studio:
 *    - businessStatus: filtrar por OPERATIONAL vs CLOSED
 *    - photoCount: verificar que se está extrayendo
 *    - hasRecentPhotos: True para activos
 *    - Score: debería aumentar para activos
 */

// Script de análisis (ejecutar en node REPL):
/*
const db = await prisma.prospect.groupBy({
  by: ["businessStatus"],
  _count: true,
});

const stats = await prisma.prospect.groupBy({
  by: ["source"],
  _count: true,
  _avg: { prospectScore: true },
  where: { businessStatus: "OPERATIONAL" },
});

console.log("📊 Distribución por status:", db);
console.log("📈 Score promedio por activos:", stats);
*/
