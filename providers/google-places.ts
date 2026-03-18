import type { ProspectCandidate, SearchSpec } from "@/lib/types";
import {
  getGooglePlacesApiKey,
  getGooglePlacesEndpoint,
} from "@/lib/env";

const GOOGLE_PLACES_API_URL =
  "https://places.googleapis.com/v1/places:searchText";

const DEFAULT_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.rating",
  "places.primaryType",
  "places.googleMapsUri",
  "places.businessStatus",
].join(",");

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  primaryType?: string;
  googleMapsUri?: string;
  businessStatus?: string;
};

function assertGooglePlacesConfig() {
  if (!getGooglePlacesApiKey()) {
    throw new Error("Falta GOOGLE_MAPS_API_KEY en el entorno.");
  }
}

function mapGooglePlaceToProspect(
  place: GooglePlace,
  search: SearchSpec
): ProspectCandidate {
  return {
    name: place.displayName?.text || "",
    contactName: "",
    city: search.city,
    email: "",
    phone: place.nationalPhoneNumber || "",
    type: search.typeLabel,
    website: place.websiteUri || "",
    rating: place.rating ? String(place.rating) : "",
    mapsUrl: place.googleMapsUri || "",
    opportunity: "",
    recommendedSite: "",
    pitchAngle: "",
    status: "generated",
    source: "google-places",
    createdAt: "",
    lastCheckedAt: "",
    businessStatus: place.businessStatus || "",
    placeId: place.id || "",
    formattedAddress: place.formattedAddress || "",
    primaryType: place.primaryType || "",
  };
}

async function searchPlaces(search: SearchSpec) {
  const endpoint = getGooglePlacesEndpoint(GOOGLE_PLACES_API_URL);
  const body = {
    textQuery: search.textQuery,
    includedType: search.includedType,
    strictTypeFiltering: true,
    languageCode: "es",
    regionCode: "MX",
    rankPreference: "RELEVANCE",
    pageSize: search.pageSize || 15,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getGooglePlacesApiKey(),
      "X-Goog-FieldMask": DEFAULT_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[google-places] ${search.label}: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const payload = (await response.json()) as {
    places?: GooglePlace[];
  };

  return (payload.places || []).map((place) => mapGooglePlaceToProspect(place, search));
}

export async function searchBusinesses(searches: SearchSpec[]) {
  assertGooglePlacesConfig();

  const allCandidates: ProspectCandidate[] = [];
  let requestCount = 0;

  for (const search of searches) {
    requestCount += 1;

    try {
      console.log(`[google-places] Buscando: ${search.label}`);
      const results = await searchPlaces(search);
      console.log(`[google-places] ${search.label}: ${results.length} resultados.`);
      allCandidates.push(...results);
    } catch (error) {
      console.error(
        error instanceof Error
          ? error.message
          : `[google-places] Fallo en ${search.label}.`
      );
    }
  }

  return {
    candidates: allCandidates,
    requestCount,
  };
}
