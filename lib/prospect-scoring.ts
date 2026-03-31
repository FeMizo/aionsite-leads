import {
  LEAD_TYPE_BAD_REVIEWS,
  LEAD_TYPE_NO_WEBSITE,
  resolveLeadType,
} from "@/lib/lead-types";
import type { ProspectCandidate } from "@/lib/types";
import { inferWebsiteSignal } from "@/lib/website-signals";

export type ProspectPriority = "alto" | "medio" | "bajo";
export type ProspectAutomationStatus = "approved" | "analyzed";
export const MINIMUM_QUALIFIED_PROSPECT_SCORE = 40;
export const AUTO_READY_PROSPECT_SCORE = 50;

type ProspectScoreInput = Pick<
  ProspectCandidate,
  "website" | "type" | "email" | "phone" | "mapsUrl" | "rating" | "userRatingCount"
>;

export function scoreProspect(prospect: ProspectScoreInput) {
  const leadType = resolveLeadType(prospect);
  const websiteSignal = inferWebsiteSignal(prospect);
  let score = 0;

  if (leadType === LEAD_TYPE_NO_WEBSITE) {
    score += 45;
  } else if (leadType === LEAD_TYPE_BAD_REVIEWS) {
    score += 35;
  } else if (websiteSignal === "social-only") {
    score += 35;
  } else if (websiteSignal === "basic") {
    score += 30;
  } else {
    score += 25;
  }

  if (prospect.rating) {
    score += 5;
  }

  if (prospect.email) {
    score += 10;
  }

  if (prospect.phone) {
    score += 5;
  }

  if (prospect.mapsUrl) {
    score += 15;
  }

  return score;
}

export function getPriority(score: number): ProspectPriority {
  if (score >= 70) {
    return "alto";
  }

  if (score >= MINIMUM_QUALIFIED_PROSPECT_SCORE) {
    return "medio";
  }

  return "bajo";
}

export function getProspectAutomationStatus(score: number): ProspectAutomationStatus {
  if (score >= 70) {
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
