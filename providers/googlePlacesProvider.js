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

function getGooglePlacesApiKey() {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.X_GOOG_API_KEY ||
    ""
  ).trim();
}

function getGooglePlacesEndpoint() {
  return (
    process.env.GOOGLE_PLACES_ENDPOINT || GOOGLE_PLACES_API_URL
  ).trim();
}

function assertGooglePlacesConfig() {
  if (!getGooglePlacesApiKey()) {
    throw new Error(
      "[googlePlacesProvider] Falta GOOGLE_PLACES_API_KEY en el entorno."
    );
  }
}

function mapGooglePlaceToProspect(place, city, type) {
  return {
    name: place.displayName && place.displayName.text ? place.displayName.text : "",
    contactName: "",
    city,
    email: "",
    phone: place.nationalPhoneNumber || "",
    type,
    website: place.websiteUri || "",
    rating: place.rating ? String(place.rating) : "",
    mapsUrl: place.googleMapsUri || "",
    opportunity: "",
    recommendedSite: "",
    pitchAngle: "",
    status: "pending",
    source: "google-places",
    createdAt: "",
    lastCheckedAt: "",
    businessStatus: place.businessStatus || "",
    placeId: place.id || "",
    formattedAddress: place.formattedAddress || "",
    primaryType: place.primaryType || "",
  };
}

async function searchPlaces(search) {
  const apiKey = getGooglePlacesApiKey();
  const body = {
    textQuery: search.textQuery,
    includedType: search.includedType,
    strictTypeFiltering: true,
    languageCode: "es",
    regionCode: "MX",
    rankPreference: "RELEVANCE",
    pageSize: search.pageSize || 15,
  };

  const response = await fetch(getGooglePlacesEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": DEFAULT_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[googlePlacesProvider] ${search.label}: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const payload = await response.json();
  const places = Array.isArray(payload.places) ? payload.places : [];

  return places.map((place) =>
    mapGooglePlaceToProspect(place, search.city, search.typeLabel)
  );
}

async function searchBusinesses(options = {}) {
  assertGooglePlacesConfig();

  const searches = Array.isArray(options.searches) ? options.searches : [];
  const allCandidates = [];

  for (const search of searches) {
    try {
      console.log(`[googlePlacesProvider] Buscando: ${search.label}`);
      const results = await searchPlaces(search);
      console.log(
        `[googlePlacesProvider] ${search.label}: ${results.length} resultados.`
      );
      allCandidates.push(...results);
    } catch (error) {
      console.error(error.message);
    }
  }

  return allCandidates;
}

module.exports = {
  mapGooglePlaceToProspect,
  name: "googlePlaces",
  searchPlaces,
  searchBusinesses,
};
