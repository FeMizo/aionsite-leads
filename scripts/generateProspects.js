const {
  loadCrmState,
  saveProspects,
  saveContactedProspects,
  syncContactedProspects,
  upsertContactedProspect,
} = require("../utils/storage");
const { filterUniqueProspects } = require("../utils/dedupe");
const {
  normalizeEmail,
  normalizeName,
  normalizePhone,
} = require("../utils/normalizers");
const mockProvider = require("../providers/mockProvider");
const googleMapsProvider = require("../providers/googleMapsProvider");
const webSearchProvider = require("../providers/webSearchProvider");
const chatProvider = require("../providers/chatProvider");

const DESIRED_PROSPECT_COUNT = 6;
const TARGET_CITIES = ["Merida", "Villahermosa", "Ciudad de Mexico"];
const REQUIRED_TYPES = ["Inmobiliaria", "Restaurante"];

const providers = {
  chat: chatProvider,
  mock: mockProvider,
  googleMaps: googleMapsProvider,
  webSearch: webSearchProvider,
};

function getConfiguredProviders() {
  const cliProviders = getCliArgValue("--provider");
  const configured = (cliProviders || process.env.LEADS_PROVIDER || "mock")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return configured.length ? configured : ["mock"];
}

function toDisplayCity(city) {
  const normalized = normalizeName(city);

  if (normalized === "merida") {
    return "Merida";
  }

  if (normalized === "villahermosa") {
    return "Villahermosa";
  }

  if (normalized === "ciudad de mexico" || normalized === "cdmx") {
    return "Ciudad de Mexico";
  }

  return city || "";
}

function inferWebsiteSignal(candidate) {
  const explicitSignal = normalizeName(candidate.websiteStatus || "");

  if (explicitSignal) {
    return explicitSignal;
  }

  if (!candidate.website) {
    return "sin-sitio";
  }

  const website = String(candidate.website).toLowerCase();

  if (
    website.includes("facebook.com") ||
    website.includes("instagram.com") ||
    website.includes("wa.me") ||
    website.includes("linktr.ee")
  ) {
    return "solo-redes";
  }

  if (
    website.includes("ueniweb.com") ||
    website.includes("wixsite.com") ||
    website.includes("sites.google.com")
  ) {
    return "sitio-basico";
  }

  return "sitio-antiguo";
}

function buildOpportunity(candidate) {
  const type = candidate.type || "Negocio local";
  const websiteSignal = inferWebsiteSignal(candidate);

  if (normalizeName(type) === "inmobiliaria") {
    return {
      opportunity:
        candidate.opportunity ||
        "su captacion digital depende demasiado de portales externos",
      recommendedSite:
        candidate.recommendedSite ||
        "portal inmobiliario con fichas de propiedades y formularios de leads",
      pitchAngle:
        candidate.pitchAngle ||
        "generar mas consultas calificadas desde Google y Meta Ads",
    };
  }

  if (normalizeName(type) === "restaurante") {
    return {
      opportunity:
        candidate.opportunity ||
        "pueden convertir mas visitas en reservas y pedidos directos",
      recommendedSite:
        candidate.recommendedSite ||
        "sitio con menu, reservas, ubicacion y galeria",
      pitchAngle:
        candidate.pitchAngle ||
        "captar reservas directas sin depender solo de redes sociales",
    };
  }

  if (normalizeName(type) === "clinica") {
    return {
      opportunity:
        candidate.opportunity ||
        "pueden facilitar citas y reforzar confianza con una presencia profesional",
      recommendedSite:
        candidate.recommendedSite ||
        "sitio medico con servicios, testimonios y solicitud de citas",
      pitchAngle:
        candidate.pitchAngle ||
        "cerrar mas citas desde busquedas locales de alta intencion",
    };
  }

  if (websiteSignal === "sin-sitio") {
    return {
      opportunity:
        candidate.opportunity ||
        "no tienen un sitio propio para transmitir confianza y captar contactos",
      recommendedSite:
        candidate.recommendedSite ||
        "sitio de presentacion con servicios, testimonios y contacto rapido",
      pitchAngle:
        candidate.pitchAngle ||
        "verse profesionales y no depender solo de directorios o redes",
    };
  }

  if (websiteSignal === "solo-redes") {
    return {
      opportunity:
        candidate.opportunity ||
        "su presencia digital depende solo de redes y eso limita conversiones",
      recommendedSite:
        candidate.recommendedSite ||
        "sitio ligero conectado a WhatsApp y redes sociales",
      pitchAngle:
        candidate.pitchAngle ||
        "dar una imagen mas seria y captar solicitudes directas",
    };
  }

  return {
    opportunity:
      candidate.opportunity ||
      "su sitio actual puede modernizarse para convertir mejor las visitas",
    recommendedSite:
      candidate.recommendedSite ||
      "sitio actualizado con llamadas a la accion y formularios claros",
    pitchAngle:
      candidate.pitchAngle ||
      "mejorar conversion y confianza con una web mas clara",
  };
}

function scoreCandidate(candidate) {
  const city = normalizeName(candidate.city);
  const type = normalizeName(candidate.type);
  const websiteSignal = inferWebsiteSignal(candidate);
  let score = 0;

  if (city === "merida") {
    score += 36;
  } else if (city === "villahermosa") {
    score += 30;
  } else if (city === "ciudad de mexico" || city === "cdmx") {
    score += 24;
  } else {
    score -= 20;
  }

  if (type === "inmobiliaria") {
    score += 34;
  } else if (type === "restaurante") {
    score += 30;
  } else if (type === "clinica") {
    score += 24;
  } else {
    score += 16;
  }

  if (websiteSignal === "sin-sitio") {
    score += 30;
  } else if (websiteSignal === "solo-redes") {
    score += 26;
  } else if (websiteSignal === "sitio-antiguo") {
    score += 20;
  } else if (websiteSignal === "sitio-basico") {
    score += 16;
  }

  if (normalizeEmail(candidate.email)) {
    score += 8;
  }

  if (normalizePhone(candidate.phone)) {
    score += 5;
  }

  if (candidate.rating) {
    score += 3;
  }

  return score;
}

function enrichCandidate(candidate, providerName) {
  const timestamp = new Date().toISOString();
  const derived = buildOpportunity(candidate);

  return {
    name: String(candidate.name || "").trim(),
    contactName: String(candidate.contactName || "").trim(),
    city: toDisplayCity(candidate.city),
    email: normalizeEmail(candidate.email) || "",
    phone: normalizePhone(candidate.phone) || "",
    type: String(candidate.type || "Negocio local").trim(),
    website: String(candidate.website || "").trim(),
    rating: candidate.rating ? String(candidate.rating).trim() : "",
    opportunity: derived.opportunity,
    recommendedSite: derived.recommendedSite,
    pitchAngle: derived.pitchAngle,
    status: "pending",
    source: String(candidate.source || providerName).trim(),
    createdAt: timestamp,
    lastCheckedAt: timestamp,
  };
}

function selectRequiredProspects(scoredCandidates) {
  const selected = [];

  for (const requiredType of REQUIRED_TYPES) {
    const match = scoredCandidates.find((item) => {
      if (selected.includes(item)) {
        return false;
      }

      return normalizeName(item.prospect.type) === normalizeName(requiredType);
    });

    if (!match) {
      throw new Error(
        `No se encontro un prospecto unico para la categoria requerida: ${requiredType}`
      );
    }

    selected.push(match);
  }

  for (const item of scoredCandidates) {
    if (selected.length >= DESIRED_PROSPECT_COUNT) {
      break;
    }

    if (!selected.includes(item)) {
      selected.push(item);
    }
  }

  if (selected.length < DESIRED_PROSPECT_COUNT) {
    throw new Error(
      `Solo se pudieron seleccionar ${selected.length} prospectos unicos.`
    );
  }

  return selected.map((item) => item.prospect);
}

function getCliArgValue(flagName) {
  const prefix = `${flagName}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : "";
}

function getProviderOptions(existingRecords) {
  const promptPath = getCliArgValue("--prompt");
  const responsePath = getCliArgValue("--response");

  return {
    cities: TARGET_CITIES,
    desiredCount: DESIRED_PROSPECT_COUNT,
    requiredTypes: REQUIRED_TYPES,
    existingRecords,
    promptPath: promptPath || undefined,
    responsePath: responsePath || undefined,
  };
}

async function fetchCandidates(providerNames, providerOptions) {
  const allCandidates = [];

  for (const providerName of providerNames) {
    const provider = providers[providerName];

    if (!provider) {
      console.warn(
        `[generateProspects] Provider desconocido "${providerName}". Se omite.`
      );
      continue;
    }

    const providerResults = await provider.searchBusinesses(providerOptions);

    console.log(
      `[generateProspects] ${providerName}: ${providerResults.length} candidatos.`
    );

    for (const candidate of providerResults) {
      allCandidates.push(enrichCandidate(candidate, providerName));
    }
  }

  return allCandidates;
}

async function generateProspects() {
  console.log("[generateProspects] Iniciando generacion de prospectos...");

  const providerNames = getConfiguredProviders();
  const state = loadCrmState();
  let contactedProspects = syncContactedProspects(
    state.contactedProspects,
    state.prospects
  );

  const existingRecords = [
    ...state.prospects,
    ...contactedProspects,
    ...state.sentLog,
  ];

  const foundCandidates = await fetchCandidates(
    providerNames,
    getProviderOptions(existingRecords)
  );
  const cityFilteredCandidates = foundCandidates.filter((candidate) =>
    TARGET_CITIES.some(
      (city) => normalizeName(city) === normalizeName(candidate.city)
    )
  );

  const { uniqueProspects, duplicates } = filterUniqueProspects(
    cityFilteredCandidates,
    existingRecords
  );

  const scoredCandidates = uniqueProspects
    .map((prospect) => ({
      prospect,
      score: scoreCandidate(prospect),
    }))
    .sort((left, right) => right.score - left.score);

  if (scoredCandidates.length < DESIRED_PROSPECT_COUNT) {
    throw new Error(
      `Se encontraron ${scoredCandidates.length} prospectos unicos, pero se necesitan ${DESIRED_PROSPECT_COUNT}.`
    );
  }

  const selectedProspects = selectRequiredProspects(scoredCandidates);
  const nextProspects = [...state.prospects, ...selectedProspects];

  for (const prospect of selectedProspects) {
    contactedProspects = upsertContactedProspect(contactedProspects, prospect, {
      status: "pending",
      at: prospect.createdAt,
      note: "Prospect generated by generateProspects.js",
    }).list;
  }

  saveProspects(nextProspects);
  saveContactedProspects(contactedProspects);

  console.log(`Prospectos encontrados: ${foundCandidates.length}`);
  console.log(`Duplicados filtrados: ${duplicates.length}`);
  console.log(`Prospectos nuevos guardados: ${selectedProspects.length}`);
  console.log(
    `[generateProspects] Providers usados: ${providerNames.join(", ")}`
  );

  return {
    foundCandidates: foundCandidates.length,
    duplicatesFiltered: duplicates.length,
    savedProspects: selectedProspects.length,
  };
}

if (require.main === module) {
  generateProspects().catch((error) => {
    console.error(`[generateProspects] Error: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  generateProspects,
};
