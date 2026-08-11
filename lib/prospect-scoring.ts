import type { ProspectCandidate } from "@/lib/types";
import { normalizeEmail, normalizePhone } from "@/lib/normalizers";
import { inferWebsiteSignal } from "@/lib/website-signals";

export type ProspectPriority = "alto" | "medio" | "bajo";
export type ProspectAutomationStatus = "approved" | "analyzed";
export const MINIMUM_SAVE_SCORE = 35;
export const MINIMUM_QUALIFIED_PROSPECT_SCORE = 50;
export const AUTO_READY_PROSPECT_SCORE = 40;
export const WHATSAPP_AUTO_SEND_SCORE = 80;
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
> & {
  businessStatus?: string;
  hasRecentPhotos?: boolean;
  photoCount?: number;
  openingHours?: { weekdayText: string[]; isOpen: boolean | null } | null;
  email?: string;
  phone?: string;
};

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

// --- SeÃ±ales individuales ---

export function hasRatingOpportunity(
  prospect: Pick<ProspectScoreInput, "rating" | "userRatingCount">
) {
  const rating = parseRating(prospect.rating || "");
  if (!rating) return false;
  const count = parseReviewCount(prospect.userRatingCount);
  if (rating <= 4.4 && rating >= 2.5 && count >= 10) return true;
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

export function hasDirectContactPath(
  prospect: Pick<ProspectScoreInput, "email" | "phone" | "hasWhatsappCta" | "hasContactCta">
) {
  return Boolean(
    normalizeEmail(prospect.email || "") ||
      normalizePhone(prospect.phone || "") ||
      prospect.hasWhatsappCta ||
      prospect.hasContactCta
  );
}

// --- SeÃ±ales agregadas ---

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
  const contactable = hasDirectContactPath(prospect);

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
    contactable,
    matchedSignals: [noWebsite, poorWebsite, ratingOpportunity, noCta].filter(Boolean).length,
  };
}

// --- Actividad del negocio ---

export function isBusinessActive(
  prospect: Pick<ProspectScoreInput, "businessStatus" | "hasRecentPhotos" | "openingHours" | "userRatingCount">
) {
  return (
    prospect.businessStatus === "OPERATIONAL" &&
    (
      prospect.hasRecentPhotos === true ||
      parseReviewCount(prospect.userRatingCount) > 5 ||
      Boolean(prospect.openingHours?.weekdayText?.length)
    )
  );
}

// --- Score principal ---

export function scoreProspect(prospect: ProspectScoreInput): number {
  const websiteSignal = inferWebsiteSignal(prospect);
  const reviewCount = parseReviewCount(prospect.userRatingCount);
  const rating = parseRating(prospect.rating || "");
  const normalizedEmail = normalizeEmail(prospect.email || "");
  const normalizedPhone = normalizePhone(prospect.phone || "");
  let score = 0;

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
    } else if (hasStoredAuditSnapshot(prospect)) {
      score += 10;
    }
  } else if (websiteSignal === "existing" && hasStoredAuditSnapshot(prospect)) {
    score += 10;
  }

  // 2. CONVERSION SIGNALS
  if (lacksContactCta(prospect)) {
    score += 12;
  }
  if (prospect.isMobileFriendly === false) {
    score += 10;
  }

  // 2b. DIRECT CONTACTABILITY
  if (normalizedPhone) {
    score += 12;
  }
  if (normalizedEmail) {
    score += 8;
  }
  if (prospect.hasWhatsappCta) {
    score += 8;
  }
  if (prospect.hasContactCta) {
    score += 6;
  }
  if (normalizedPhone && normalizedEmail) {
    score += 4;
  }
  if (!hasDirectContactPath(prospect)) {
    score -= 8;
  }

  // 3. TRACTION
  if (reviewCount >= 50) {
    score += 15;
  } else if (reviewCount >= 15) {
    score += 8;
  }

  // 4. RATING URGENCY
  if (hasRatingOpportunity(prospect)) {
    score += 20;
  }

  // 5. BUSINESS ACTIVITY
  if (prospect.businessStatus === "OPERATIONAL") {
    score += 5;
  }
  if (prospect.hasRecentPhotos) {
    score += 15;
  }
  if (prospect.openingHours?.weekdayText && prospect.openingHours.weekdayText.length > 0) {
    score += 5;
  }
  if ((prospect.photoCount ?? 0) === 0 && reviewCount < 10) {
    score -= 10;
  }

  if (
    score === 0 &&
    !hasStoredAuditSnapshot(prospect) &&
    (websiteSignal === "existing" || rating !== null)
  ) {
    return INCOMPLETE_AUDIT_BASELINE_SCORE;
  }

  return score;
}

export type ProspectScoreCard = {
  score: number;
  priority: ProspectPriority;
  automationStatus: ProspectAutomationStatus;
  signals: ReturnType<typeof getProspectSignalCounts>;
};

export function getProspectScoreCard(
  prospect: ProspectScoreInput
): ProspectScoreCard {
  const score = scoreProspect(prospect);

  return {
    score,
    priority: getPriority(score),
    automationStatus: getProspectAutomationStatus(score),
    signals: getProspectSignalCounts(prospect),
  };
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
  return score >= AUTO_READY_PROSPECT_SCORE;
}
