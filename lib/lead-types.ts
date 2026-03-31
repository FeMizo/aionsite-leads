import { normalizeName } from "@/lib/normalizers";
import { inferWebsiteSignal } from "@/lib/website-signals";

export const LEAD_TYPE_NO_WEBSITE = "Negocios SIN pagina web";
export const LEAD_TYPE_OLD_WEBSITE = "Negocios con web rota o vieja";
export const LEAD_TYPE_BAD_REVIEWS = "Negocios con malas resenas pero buen trafico";

export const LEAD_TYPES = [
  LEAD_TYPE_NO_WEBSITE,
  LEAD_TYPE_OLD_WEBSITE,
  LEAD_TYPE_BAD_REVIEWS,
] as const;

export type LeadType = (typeof LEAD_TYPES)[number];

type LeadTypeInput = {
  type?: string;
  website?: string;
  rating?: string;
  userRatingCount?: number | null;
};

function parseRating(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeLeadType(value: string) {
  const normalized = normalizeName(value);

  if (
    normalized === "negocios sin pagina web" ||
    normalized === "sin pagina web" ||
    normalized === "sin web" ||
    normalized === "no website"
  ) {
    return LEAD_TYPE_NO_WEBSITE;
  }

  if (
    normalized === "negocios con web rota o vieja" ||
    normalized === "web rota o vieja" ||
    normalized === "web vieja" ||
    normalized === "web rota"
  ) {
    return LEAD_TYPE_OLD_WEBSITE;
  }

  if (
    normalized === "negocios con malas resenas pero buen trafico" ||
    normalized === "malas resenas pero buen trafico" ||
    normalized === "malas resenas" ||
    normalized === "malas resenas buen trafico"
  ) {
    return LEAD_TYPE_BAD_REVIEWS;
  }

  return "";
}

export function hasBadReviewsWithTraffic(input: {
  rating?: string;
  userRatingCount?: number | null;
}) {
  const rating = parseRating(input.rating);

  if (!rating) {
    return false;
  }

  if (
    typeof input.userRatingCount === "number" &&
    Number.isFinite(input.userRatingCount) &&
    input.userRatingCount > 0
  ) {
    return rating <= 4.3 && input.userRatingCount >= 15;
  }

  return rating <= 4.0;
}

export function inferLeadType(input: Omit<LeadTypeInput, "type">) {
  const websiteSignal = inferWebsiteSignal({
    website: input.website || "",
  });

  if (websiteSignal === "missing") {
    return LEAD_TYPE_NO_WEBSITE;
  }

  if (hasBadReviewsWithTraffic(input)) {
    return LEAD_TYPE_BAD_REVIEWS;
  }

  return LEAD_TYPE_OLD_WEBSITE;
}

export function resolveLeadType(input: LeadTypeInput) {
  const explicit = normalizeLeadType(input.type || "");

  if (explicit) {
    return explicit;
  }

  return inferLeadType(input);
}
