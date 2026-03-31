import type { ProspectCandidate } from "@/lib/types";
import { inferWebsiteSignal } from "@/lib/website-signals";

export type ProspectPriority = "alto" | "medio" | "bajo";
export type ProspectAutomationStatus = "approved" | "analyzed";
export const MINIMUM_QUALIFIED_PROSPECT_SCORE = 60;
export const AUTO_READY_PROSPECT_SCORE = 60;

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

export function hasRatingOpportunity(prospect: Pick<ProspectScoreInput, "rating">) {
  const rating = parseRating(prospect.rating || "");
  return Boolean(rating && rating >= 3.5 && rating <= 4.5);
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

  return {
    noWebsite,
    poorWebsite,
    ratingOpportunity,
    noCta,
    oldWebsite,
    notMobileFriendly,
    goodReviewsBadPresence,
    matchedSignals: [noWebsite, poorWebsite, ratingOpportunity, noCta].filter(Boolean).length,
  };
}

export function scoreProspect(prospect: ProspectScoreInput) {
  const signals = getProspectSignalCounts(prospect);
  let score = 0;

  if (signals.noWebsite) {
    score += 40;
  }

  if (signals.poorWebsite) {
    score += 30;
  }

  if (signals.ratingOpportunity) {
    score += 20;
  }

  if (signals.noCta) {
    score += 10;
  }

  return score;
}

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
