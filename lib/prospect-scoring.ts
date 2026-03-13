import { normalizeName, normalizeWebsite } from "@/lib/normalizers";
import type { ProspectCandidate } from "@/lib/types";

const TARGET_CITIES = ["merida", "villahermosa", "ciudad de mexico"];

export function inferWebsiteSignal(prospect: Pick<ProspectCandidate, "website">) {
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

export function scoreProspect(prospect: ProspectCandidate) {
  const city = normalizeName(prospect.city);
  const type = normalizeName(prospect.type);
  const websiteSignal = inferWebsiteSignal(prospect);
  const rating = Number(prospect.rating) || 0;
  let score = 0;

  if (TARGET_CITIES.includes(city)) {
    score += 20;
  }

  if (websiteSignal === "missing") {
    score += 30;
  } else if (websiteSignal === "social-only") {
    score += 24;
  } else if (websiteSignal === "basic") {
    score += 16;
  } else {
    score += 8;
  }

  if (type === "restaurante") {
    score += 24;
  } else if (type === "inmobiliaria") {
    score += 26;
  } else if (type === "clinica") {
    score += 18;
  } else {
    score += 10;
  }

  if (rating >= 4.7) {
    score += 10;
  } else if (rating >= 4.3) {
    score += 7;
  } else if (rating >= 4) {
    score += 4;
  }

  if (prospect.email) {
    score += 4;
  }

  if (prospect.phone) {
    score += 3;
  }

  return score;
}
