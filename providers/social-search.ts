import type { ProspectCandidate, SearchSpec } from "@/lib/types";
import { getBraveSearchApiKey } from "@/lib/env";
import { normalizeWhitespace } from "@/lib/normalizers";

const BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const SOCIAL_DOMAINS = ["facebook.com", "instagram.com"];

type BraveWebResult = {
  title?: string;
  url?: string;
  description?: string;
  profile?: {
    name?: string;
    long_name?: string;
    url?: string;
  };
};

type BraveSearchResponse = {
  web?: {
    results?: BraveWebResult[];
  };
};

function isSocialUrl(value: string) {
  const normalized = String(value || "").toLowerCase();
  return SOCIAL_DOMAINS.some((domain) => normalized.includes(domain));
}

function decodeHtml(value: string) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, " "));
}

function guessNameFromResult(result: BraveWebResult, url: string) {
  const title = normalizeWhitespace(stripHtml(result.title || ""));
  if (title) {
    return title.replace(/\s*[-|]\s*(facebook|instagram)\s*$/i, "").trim();
  }

  const profileName = normalizeWhitespace(
    result.profile?.name || result.profile?.long_name || ""
  );
  if (profileName) {
    return profileName;
  }

  try {
    const pathname = new URL(url).pathname
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)[0];

    return pathname ? pathname.replace(/[._-]+/g, " ") : url;
  } catch {
    return url;
  }
}

function mapBraveResultToProspect(result: BraveWebResult, search: SearchSpec): ProspectCandidate | null {
  const url = result.url ? result.url.trim() : "";

  if (!url || !isSocialUrl(url)) {
    return null;
  }

  return {
    name: guessNameFromResult(result, url),
    contactName: "",
    city: search.city,
    email: "",
    phone: "",
    type: search.typeLabel?.toLowerCase() || "negocio_social",
    website: url,
    rating: "",
    userRatingCount: null,
    mapsUrl: "",
    opportunity: "",
    recommendedSite: "",
    pitchAngle: "",
    status: "generated",
    source: "social-search",
    createdAt: "",
    lastCheckedAt: "",
    businessStatus: "",
    placeId: "",
    formattedAddress: "",
    primaryType: search.typeLabel?.toLowerCase() || "",
    hasRecentPhotos: false,
    mostRecentPhotoDate: null,
    photoCount: 0,
    hasCompleteHours: false,
    openingHours: null,
    businessTypes: [],
  };
}

async function searchBrave(search: SearchSpec, domain: string, apiKey: string) {
  const query = [
    `site:${domain}`,
    `"${search.queryVariant || search.textQuery}"`,
    `"${search.city}"`,
  ].join(" ");

  const url = new URL(BRAVE_SEARCH_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("count", "10");
  url.searchParams.set("country", "mx");
  url.searchParams.set("search_lang", "es");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(
      `[social-search] ${search.label} @ ${domain}: ${response.status} ${response.statusText}`
    );
  }

  const payload = (await response.json()) as BraveSearchResponse;
  const results = payload.web?.results || [];
  const mapped: ProspectCandidate[] = [];

  for (const result of results) {
    const prospect = mapBraveResultToProspect(result, search);

    if (!prospect) {
      continue;
    }

    mapped.push(prospect);

    if (mapped.length >= 5) {
      break;
    }
  }

  return mapped;
}

export async function searchSocialBusinesses(searches: SearchSpec[]) {
  const apiKey = getBraveSearchApiKey();

  if (!apiKey) {
    console.warn(
      "[social-search] Falta BRAVE_SEARCH_API_KEY; se omite el fallback social."
    );

    return {
      candidates: [] as ProspectCandidate[],
      requestCount: 0,
    };
  }

  const allCandidates: ProspectCandidate[] = [];
  let requestCount = 0;

  for (const search of searches) {
    for (const domain of SOCIAL_DOMAINS) {
      requestCount += 1;

      try {
        console.log(`[social-search] Buscando: ${search.label} @ ${domain}`);
        const results = await searchBrave(search, domain, apiKey);
        console.log(
          `[social-search] ${search.label} @ ${domain}: ${results.length} resultados.`
        );
        allCandidates.push(...results);
      } catch (error) {
        console.error(
          error instanceof Error
            ? error.message
            : `[social-search] Fallo en ${search.label} @ ${domain}.`
        );
      }
    }
  }

  return {
    candidates: allCandidates,
    requestCount,
  };
}
