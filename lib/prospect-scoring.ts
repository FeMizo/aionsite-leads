import { normalizeName, normalizeWebsite } from "@/lib/normalizers";
import type { ProspectCandidate } from "@/lib/types";

export type ProspectPriority = "alto" | "medio" | "bajo";
export type ProspectAutomationStatus = "approved" | "analyzed";
export const MINIMUM_QUALIFIED_PROSPECT_SCORE = 40;

type ProspectScoreInput = Pick<
  ProspectCandidate,
  "website" | "type" | "email" | "phone" | "mapsUrl"
>;

export function inferWebsiteSignal(prospect: Pick<ProspectScoreInput, "website">) {
  if (!prospect.website) {
    return "missing";
  }

  const website = normalizeWebsite(prospect.website);

  if (
    website.includes("facebook.com") ||
    website.includes("instagram.com") ||
    website.includes("wa.me") ||
    website.includes("linktr.ee")
  ) {
    return "social-only";
  }

  if (
    website.includes("ueniweb.com") ||
    website.includes("wixsite.com") ||
    website.includes("sites.google.com")
  ) {
    return "basic";
  }

  return "existing";
}

export function scoreProspect(prospect: ProspectScoreInput) {
  const type = normalizeName(prospect.type);
  const websiteSignal = inferWebsiteSignal(prospect);
  let score = 0;

  if (websiteSignal === "missing") {
    score += 40;
  } else if (websiteSignal === "social-only") {
    score += 30;
  } else if (websiteSignal === "basic") {
    score += 20;
  }

  if (type === "restaurante" || type === "restaurant") {
    score += 10;
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

export function getProspectScoreCard(prospect: ProspectScoreInput) {
  const score = scoreProspect(prospect);

  return {
    score,
    priority: getPriority(score),
    automationStatus: getProspectAutomationStatus(score),
  };
}
