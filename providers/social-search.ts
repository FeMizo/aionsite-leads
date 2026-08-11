import type { ProspectCandidate, SearchSpec } from "@/lib/types";

const SOCIAL_SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/";
const SOCIAL_DOMAINS = ["facebook.com", "instagram.com"];

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

function decodeResultUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl, SOCIAL_SEARCH_ENDPOINT);
    const uddg = url.searchParams.get("uddg");

    if (uddg) {
      return decodeURIComponent(uddg);
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

function isSocialUrl(value: string) {
  const normalized = String(value || "").toLowerCase();
  return SOCIAL_DOMAINS.some((domain) => normalized.includes(domain));
}

function guessNameFromResult(title: string, url: string) {
  const cleanTitle = stripHtml(title)
    .replace(/\s*[-|]\s*(facebook|instagram)\s*$/i, "")
    .replace(/\s*[-|]\s*social\s*$/i, "")
    .trim();

  if (cleanTitle) {
    return cleanTitle;
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

function mapSocialResultToProspect(
  title: string,
  url: string,
  search: SearchSpec
): ProspectCandidate {
  return {
    name: guessNameFromResult(title, url),
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

async function searchSocialPage(search: SearchSpec, domain: string) {
  const query = [
    `site:${domain}`,
    `"${search.queryVariant || search.textQuery}"`,
    `"${search.city}"`,
  ].join(" ");

  const url = new URL(SOCIAL_SEARCH_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("ia", "web");

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(
      `[social-search] ${search.label} @ ${domain}: ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();
  const results: ProspectCandidate[] = [];
  const resultRegex =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = resultRegex.exec(html))) {
    const rawUrl = decodeHtml(match[1]);
    const resolvedUrl = decodeResultUrl(rawUrl);
    const title = match[2];

    if (!isSocialUrl(resolvedUrl)) {
      continue;
    }

    results.push(mapSocialResultToProspect(title, resolvedUrl, search));

    if (results.length >= 5) {
      break;
    }
  }

  return results;
}

export async function searchSocialBusinesses(searches: SearchSpec[]) {
  const allCandidates: ProspectCandidate[] = [];
  let requestCount = 0;

  for (const search of searches) {
    for (const domain of SOCIAL_DOMAINS) {
      requestCount += 1;

      try {
        console.log(`[social-search] Buscando: ${search.label} @ ${domain}`);
        const results = await searchSocialPage(search, domain);
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
