import { normalizeName } from "@/lib/normalizers";
import { getBraveSearchApiKey, getGooglePlacesApiKey, getGooglePlacesEndpoint } from "@/lib/env";

type ProspectIdentity = { name: string; city: string; type: string; website: string };
type PlaceResult = {
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
};

export type ResearchSourceResult = {
  values: Array<{ field: string; value: string | number | boolean; sourceName: string; sourceUrl: string; confidence: "high" | "medium"; confidenceReason: string }>;
  error?: string;
  skipped?: boolean;
};

const PLACES_FIELDS = [
  "places.displayName", "places.formattedAddress", "places.websiteUri",
  "places.nationalPhoneNumber", "places.rating", "places.userRatingCount", "places.primaryType",
  "places.googleMapsUri", "places.businessStatus",
].join(",");

export async function researchGooglePlace(prospect: ProspectIdentity): Promise<ResearchSourceResult> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return { values: [], error: "Google Places no está configurado." };

  try {
    const response = await fetch(getGooglePlacesEndpoint("https://places.googleapis.com/v1/places:searchText"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": PLACES_FIELDS,
      },
      body: JSON.stringify({
        textQuery: `${prospect.name} ${prospect.city} ${prospect.type} México`,
        languageCode: "es", regionCode: "MX", pageSize: 5,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Google Places respondió ${response.status}.`);

    const payload = (await response.json()) as { places?: PlaceResult[] };
    const exactName = (payload.places || []).filter((place) =>
      normalizeName(place.displayName?.text || "") === normalizeName(prospect.name)
    );
    const cityMatches = exactName.filter((place) =>
      normalizeName(place.formattedAddress || "").includes(normalizeName(prospect.city))
    );
    // Do not turn a same-name business in another city into a CRM fact.
    if (cityMatches.length !== 1) {
      return { values: [], error: exactName.length ? "Coincidencia ambigua; no se sugirieron cambios." : "Google Places no devolvió una coincidencia exacta de nombre y ciudad." };
    }

    const place = cityMatches[0];
    const sourceUrl = place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${prospect.name} ${prospect.city}`)}`;
    const values: ResearchSourceResult["values"] = [];
    const add = (field: string, value: string | number | undefined) => {
      if (value !== undefined && value !== "") values.push({ field, value, sourceName: "Google Places", sourceUrl, confidence: "high", confidenceReason: "Nombre del negocio y ciudad coinciden exactamente con Google Places." });
    };
    add("name", place.displayName?.text);
    add("formattedAddress", place.formattedAddress);
    add("website", place.websiteUri);
    add("phone", place.nationalPhoneNumber);
    add("rating", place.rating);
    add("userRatingCount", place.userRatingCount);
    add("primaryType", place.primaryType);
    add("mapsUrl", place.googleMapsUri);
    add("businessStatus", place.businessStatus);
    return { values };
  } catch (error) {
    return { values: [], error: error instanceof Error ? error.message : "Falló la consulta de Google Places." };
  }
}

export async function researchBraveSocialProfile(prospect: ProspectIdentity): Promise<ResearchSourceResult> {
  const apiKey = getBraveSearchApiKey();
  if (!apiKey) return { values: [], skipped: true, error: "Brave Search no está configurado." };

  try {
    const urls: string[] = [];
    for (const domain of ["facebook.com", "instagram.com"]) {
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.set("q", `site:${domain} "${prospect.name}" "${prospect.city}"`);
      url.searchParams.set("count", "5");
      url.searchParams.set("country", "mx");
      url.searchParams.set("search_lang", "es");
      const response = await fetch(url, {
        headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error(`Brave Search respondió ${response.status}.`);
      const payload = (await response.json()) as { web?: { results?: Array<{ title?: string; url?: string }> } };
      for (const result of payload.web?.results || []) {
        if (!result.url || !result.title) continue;
        let resultHost = "";
        try { resultHost = new URL(result.url).hostname.toLowerCase(); } catch { continue; }
        if (!(resultHost === domain || resultHost.endsWith(`.${domain}`))) continue;
        const title = result.title.replace(/\s*[-|]\s*(facebook|instagram)\s*$/i, "").trim();
        if (normalizeName(title) === normalizeName(prospect.name)) urls.push(result.url);
      }
    }
    const uniqueUrls = [...new Set(urls)];
    if (uniqueUrls.length !== 1) return { values: [], error: uniqueUrls.length ? "Brave encontró varios perfiles coincidentes; no se sugirió uno." : "No se encontró un perfil social con nombre exacto." };
    return { values: [{ field: "website", value: uniqueUrls[0], sourceName: "Brave Search", sourceUrl: uniqueUrls[0], confidence: "medium", confidenceReason: "El título coincide, pero Brave no confirma por sí solo que la cuenta pertenezca al negocio." }] };
  } catch (error) {
    return { values: [], error: error instanceof Error ? error.message : "Falló la consulta de Brave Search." };
  }
}
