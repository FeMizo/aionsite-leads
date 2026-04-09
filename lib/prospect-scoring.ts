import type { ProspectCandidate } from "@/lib/types";
import { inferWebsiteSignal } from "@/lib/website-signals";

export type ProspectPriority = "alto" | "medio" | "bajo";
export type ProspectAutomationStatus = "approved" | "analyzed";
export const MINIMUM_QUALIFIED_PROSPECT_SCORE = 50;
export const AUTO_READY_PROSPECT_SCORE = 75;
const INCOMPLETE_AUDIT_BASELINE_SCORE = 12;

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
>;

function parseRating(value: string) {
  const parsed = Number.parseFloat(String(value || "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseReviewCount(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function hasStoredAuditSnapshot(prospect: ProspectScoreInput): boolean {
  return (
    typeof prospect.userRatingCount === "number" ||
    Boolean(prospect.websiteFetchFailed) ||
    typeof prospect.websiteLoadTimeMs === "number" ||
    prospect.hasWhatsappCta !== null && prospect.hasWhatsappCta !== undefined ||
    prospect.hasContactCta !== null && prospect.hasContactCta !== undefined ||
    prospect.isMobileFriendly !== null && prospect.isMobileFriendly !== undefined
  );
}

// --- Señales individuales ---

export function hasRatingOpportunity(prospect: Pick<ProspectScoreInput, "rating" | "userRatingCount">) {
  const rating = parseRating(prospect.rating || "");
  if (!rating) return false;
  const count = parseReviewCount(prospect.userRatingCount);
  // Negocio con reseñas y rating bajo = problema activo de reputacion digital
  if (rating <= 4.4 && rating >= 2.5 && count >= 10) return true;
  // Rating muy bajo sin reseñas minimas = señal de alarma igual
  if (rating <= 4.0) return true;
  return false;
}

export function hasPoorWebsite(
  prospect: Pick<
    ProspectScoreInput,
    "website" | "websiteFetchFailed" | "websiteLoadTimeMs"
  >
) {
  const websiteSignal = inferWebsiteSignal(prospect);

  if (websiteSignal === "missing") {
    return false;
  }

  return (
    websiteSignal === "social-only" ||
    websiteSignal === "basic" ||
    Boolean(prospect.websiteFetchFailed) ||
    (typeof prospect.websiteLoadTimeMs === "number" && prospect.websiteLoadTimeMs >= 4500)
  );
}

export function lacksContactCta(
  prospect: Pick<ProspectScoreInput, "website" | "hasWhatsappCta" | "hasContactCta">
) {
  if (!prospect.website) {
    return false;
  }

  if (prospect.hasWhatsappCta === null || prospect.hasContactCta === null) {
    return false;
  }

  return !prospect.hasWhatsappCta && !prospect.hasContactCta;
}

// --- Señales agregadas ---

export function getProspectSignalCounts(prospect: ProspectScoreInput) {
  const websiteSignal = inferWebsiteSignal(prospect);
  const noWebsite = websiteSignal === "missing";
  const poorWebsite = hasPoorWebsite(prospect);
  const ratingOpportunity = hasRatingOpportunity(prospect);
  const noCta = lacksContactCta(prospect);
  const oldWebsite = websiteSignal === "basic";
  const notMobileFriendly = prospect.isMobileFriendly === false;
  const goodReviewsBadPresence =
    !ratingOpportunity &&
    parseRating(prospect.rating || "") !== null &&
    parseRating(prospect.rating || "")! > 4.5 &&
    poorWebsite;

  const reviewCount = parseReviewCount(prospect.userRatingCount);
  const hasHighReviews = reviewCount >= 50;
  const hasMediumReviews = reviewCount >= 15 && reviewCount < 50;

  return {
    noWebsite,
    poorWebsite,
    ratingOpportunity,
    noCta,
    oldWebsite,
    notMobileFriendly,
    goodReviewsBadPresence,
    hasHighReviews,
    hasMediumReviews,
    matchedSignals: [noWebsite, poorWebsite, ratingOpportunity, noCta].filter(Boolean).length,
  };
}

// --- Score principal ---

export function scoreProspect(prospect: ProspectScoreInput): number {
  const websiteSignal = inferWebsiteSignal(prospect);
  const reviewCount = parseReviewCount(prospect.userRatingCount);
  const rating = parseRating(prospect.rating || "");
  let score = 0;

  // 1. ESTADO DEL SITIO WEB (señales mutuamente excluyentes, ordenadas por gravedad)
  //    Captura el nivel de dolor digital del negocio.
  if (websiteSignal === "missing") {
    // Sin web: maxima oportunidad de venta directa
    score += 40;
  } else if (websiteSignal === "social-only") {
    // Solo redes sociales: no captan trafico organico ni leads directos
    score += 30;
  } else if (websiteSignal === "basic") {
    // Sitio basico (Wix/Google Sites): percepcion de negocio informal
    score += 24;
  } else if (prospect.websiteFetchFailed) {
    // Sitio caido o inaccesible: pierde clientes en el primer click
    score += 20;
  } else if (typeof prospect.websiteLoadTimeMs === "number") {
    if (prospect.websiteLoadTimeMs >= 6000) {
      // Muy lento (>6s): abandono casi seguro en movil
      score += 16;
    } else if (prospect.websiteLoadTimeMs >= 4500) {
      // Lento (4.5-6s): friccion alta en conversion
      score += 10;
    }
  }

  // 2. SEÑALES DE CONVERSION (se acumulan sobre el estado del sitio)
  //    Cuantifican cuanto dinero se pierde hoy por falta de UX.
  if (lacksContactCta(prospect)) {
    // Sin boton de contacto ni WhatsApp: visitas sin conversion
    score += 12;
  }
  if (prospect.isMobileFriendly === false) {
    // No responsive: la mayoria del trafico local es movil
    score += 10;
  }

  // 3. TRACCION DEL NEGOCIO (reseñas = tiene clientes, tiene caja, puede pagar)
  if (reviewCount >= 50) {
    score += 15;
  } else if (reviewCount >= 15) {
    score += 8;
  }

  // 4. SEÑAL DE RATING (problema de reputacion activo = urgencia de mejorar presencia)
  if (hasRatingOpportunity(prospect)) {
    score += 20;
  }

  // Older records can lose review-count and audit fields after persistence.
  // Give them a small baseline instead of rendering as 0 when we still know
  // they have a website or rating, but keep them clearly below qualification.
  if (
    score === 0 &&
    !hasStoredAuditSnapshot(prospect) &&
    (websiteSignal === "existing" || rating !== null)
  ) {
    return INCOMPLETE_AUDIT_BASELINE_SCORE;
  }

  return score;
}

// --- Clasificacion ---

export function getPriority(score: number): ProspectPriority {
  if (score >= 80) {
    return "alto";
  }

  if (score >= MINIMUM_QUALIFIED_PROSPECT_SCORE) {
    return "medio";
  }

  return "bajo";
}

export function getProspectAutomationStatus(score: number): ProspectAutomationStatus {
  if (score >= MINIMUM_QUALIFIED_PROSPECT_SCORE) {
    return "approved";
  }

  return "analyzed";
}

export function shouldAutoAdvanceProspect(score: number) {
  return score > AUTO_READY_PROSPECT_SCORE;
}

export function getProspectScoreCard(prospect: ProspectScoreInput) {
  const score = scoreProspect(prospect);

  return {
    score,
    priority: getPriority(score),
    automationStatus: getProspectAutomationStatus(score),
  };
}
