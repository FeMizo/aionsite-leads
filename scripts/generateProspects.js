require("dotenv").config();

const {
  addGeneratedRecords,
  loadCrmState,
  saveCrmState,
} = require("../utils/crm");
const { filterUniqueProspects, isDuplicateProspect } = require("../utils/dedupe");
const {
  normalizeEmail,
  normalizeName,
  normalizePhone,
} = require("../utils/normalizers");
const { scoreProspect, inferWebsiteSignal } = require("../utils/prospectScoring");
const googlePlacesProvider = require("../providers/googlePlacesProvider");
const emailFinderProvider = require("../providers/emailFinderProvider");
const mockProvider = require("../providers/mockProvider");
const chatProvider = require("../providers/chatProvider");

const DESIRED_PROSPECT_COUNT = 6;
const REQUIRED_TYPES = ["Inmobiliaria", "Restaurante"];
const REQUIRE_EMAIL_FOR_FINAL_PROSPECTS = true;
const SEARCHES = [
  {
    id: "restaurant-merida",
    city: "Merida",
    label: "restaurante en Merida",
    textQuery: "restaurante en Merida, Yucatan, Mexico",
    typeLabel: "Restaurante",
    includedType: "restaurant",
  },
  {
    id: "real-estate-merida",
    city: "Merida",
    label: "inmobiliaria en Merida",
    textQuery: "inmobiliaria en Merida, Yucatan, Mexico",
    typeLabel: "Inmobiliaria",
    includedType: "real_estate_agency",
  },
  {
    id: "clinic-merida",
    city: "Merida",
    label: "clinica en Merida",
    textQuery: "clinica en Merida, Yucatan, Mexico",
    typeLabel: "Clinica",
    includedType: "doctor",
  },
  {
    id: "restaurant-villahermosa",
    city: "Villahermosa",
    label: "restaurante en Villahermosa",
    textQuery: "restaurante en Villahermosa, Tabasco, Mexico",
    typeLabel: "Restaurante",
    includedType: "restaurant",
  },
  {
    id: "real-estate-villahermosa",
    city: "Villahermosa",
    label: "inmobiliaria en Villahermosa",
    textQuery: "inmobiliaria en Villahermosa, Tabasco, Mexico",
    typeLabel: "Inmobiliaria",
    includedType: "real_estate_agency",
  },
  {
    id: "restaurant-cdmx",
    city: "Ciudad de Mexico",
    label: "restaurante en Ciudad de Mexico",
    textQuery: "restaurante en Ciudad de Mexico, Mexico",
    typeLabel: "Restaurante",
    includedType: "restaurant",
  },
  {
    id: "real-estate-cdmx",
    city: "Ciudad de Mexico",
    label: "inmobiliaria en Ciudad de Mexico",
    textQuery: "inmobiliaria en Ciudad de Mexico, Mexico",
    typeLabel: "Inmobiliaria",
    includedType: "real_estate_agency",
  },
];

const providers = {
  chat: chatProvider,
  googlePlaces: googlePlacesProvider,
  mock: mockProvider,
};

function getCliArgValue(flagName) {
  const prefix = `${flagName}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : "";
}

function getConfiguredProviders() {
  const cliProviders = getCliArgValue("--provider");
  const configured = (cliProviders || process.env.LEADS_PROVIDER || "googlePlaces")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return configured.length ? configured : ["googlePlaces"];
}

function buildOpportunity(prospect) {
  const type = normalizeName(prospect.type);
  const websiteSignal = inferWebsiteSignal(prospect);

  if (type === "inmobiliaria") {
    return {
      opportunity:
        websiteSignal === "missing"
          ? "no tienen sitio propio para captar compradores y vendedores"
          : "su sitio actual puede captar mas leads de propiedades",
      recommendedSite: "portal inmobiliario con catalogo, filtros y formularios",
      pitchAngle: "generar mas consultas calificadas de propiedades",
    };
  }

  if (type === "restaurante") {
    return {
      opportunity:
        websiteSignal === "missing" || websiteSignal === "social-only"
          ? "dependen de Google y redes para reservas o pedidos"
          : "su sitio actual puede convertir mejor visitas en reservas",
      recommendedSite: "sitio con menu, reservas, mapa y CTA a WhatsApp",
      pitchAngle: "captar reservas directas sin depender solo de redes",
    };
  }

  if (type === "clinica") {
    return {
      opportunity:
        websiteSignal === "missing"
          ? "no tienen un sitio claro para captar citas y transmitir confianza"
          : "pueden convertir mejor las busquedas locales en citas",
      recommendedSite: "sitio medico con servicios, doctores y solicitud de citas",
      pitchAngle: "generar mas citas desde busquedas locales de alta intencion",
    };
  }

  return {
    opportunity:
      websiteSignal === "missing"
        ? "no cuentan con un sitio propio para generar confianza y contactos"
        : "su presencia digital puede modernizarse para convertir mejor",
    recommendedSite: "sitio de presentacion con servicios, testimonios y contacto",
    pitchAngle: "verse mas profesionales y captar solicitudes directas",
  };
}

function normalizeProspect(rawProspect) {
  const timestamp = new Date().toISOString();
  const derived = buildOpportunity(rawProspect);

  return {
    name: String(rawProspect.name || "").trim(),
    contactName: String(rawProspect.contactName || "").trim(),
    city: String(rawProspect.city || "").trim(),
    email: normalizeEmail(rawProspect.email) || "",
    phone: normalizePhone(rawProspect.phone) || "",
    type: String(rawProspect.type || "Negocio local").trim(),
    website: String(rawProspect.website || "").trim(),
    rating: rawProspect.rating ? String(rawProspect.rating).trim() : "",
    mapsUrl: String(rawProspect.mapsUrl || rawProspect.googleMapsUri || "").trim(),
    opportunity: rawProspect.opportunity || derived.opportunity,
    recommendedSite: rawProspect.recommendedSite || derived.recommendedSite,
    pitchAngle: rawProspect.pitchAngle || derived.pitchAngle,
    status: "pending",
    source: String(rawProspect.source || "google-places").trim(),
    createdAt: rawProspect.createdAt || timestamp,
    lastCheckedAt: rawProspect.lastCheckedAt || timestamp,
    businessStatus: String(rawProspect.businessStatus || "").trim(),
  };
}

function getProviderOptions(existingRecords) {
  const promptPath = getCliArgValue("--prompt");
  const responsePath = getCliArgValue("--response");

  return {
    searches: SEARCHES,
    desiredCount: DESIRED_PROSPECT_COUNT,
    requiredTypes: REQUIRED_TYPES,
    existingRecords,
    cities: Array.from(new Set(SEARCHES.map((search) => search.city))),
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

    const results = await provider.searchBusinesses(providerOptions);
    console.log(`[generateProspects] ${providerName}: ${results.length} candidatos.`);
    allCandidates.push(...results.map(normalizeProspect));
  }

  return allCandidates;
}

async function enrichProspectEmail(prospect) {
  const email = prospect.website
    ? await emailFinderProvider.findEmailFromWebsite(prospect.website)
    : "";

  return {
    ...prospect,
    email: normalizeEmail(email || prospect.email) || "",
    lastCheckedAt: new Date().toISOString(),
  };
}

function ensureRequiredTypes(prospects) {
  for (const type of REQUIRED_TYPES) {
    const exists = prospects.some(
      (prospect) => normalizeName(prospect.type) === normalizeName(type)
    );

    if (!exists) {
      throw new Error(`No se pudo conservar un prospecto final de tipo ${type}.`);
    }
  }
}

function buildSelectedOrder(scoredCandidates) {
  const ordered = [];

  for (const requiredType of REQUIRED_TYPES) {
    const match = scoredCandidates.find((item) => {
      if (ordered.includes(item)) {
        return false;
      }

      return normalizeName(item.prospect.type) === normalizeName(requiredType);
    });

    if (!match) {
      throw new Error(
        `No se encontro un prospecto unico para la categoria requerida: ${requiredType}`
      );
    }

    ordered.push(match);
  }

  for (const item of scoredCandidates) {
    if (!ordered.includes(item)) {
      ordered.push(item);
    }
  }

  return ordered;
}

function pickProspectByType(candidates, type, selected) {
  return candidates.find((candidate) => {
    if (selected.includes(candidate)) {
      return false;
    }

    return normalizeName(candidate.type) === normalizeName(type);
  });
}

function selectFinalProspects(candidates) {
  const selected = [];

  for (const requiredType of REQUIRED_TYPES) {
    const match = pickProspectByType(candidates, requiredType, selected);

    if (!match) {
      throw new Error(
        `No se encontro un prospecto final con email para la categoria requerida: ${requiredType}.`
      );
    }

    selected.push(match);
  }

  for (const candidate of candidates) {
    if (selected.length >= DESIRED_PROSPECT_COUNT) {
      break;
    }

    if (!selected.includes(candidate)) {
      selected.push(candidate);
    }
  }

  if (selected.length < DESIRED_PROSPECT_COUNT) {
    throw new Error(
      `Despues del enriquecimiento solo quedaron ${selected.length} prospectos unicos con email.`
    );
  }

  return selected;
}

async function buildFinalProspects(scoredCandidates, state) {
  const eligibleProspects = [];
  let enrichmentDuplicates = 0;
  let prospectsWithoutEmail = 0;
  const ordered = buildSelectedOrder(scoredCandidates);

  for (const item of ordered) {
    const enriched = await enrichProspectEmail(item.prospect);

    if (REQUIRE_EMAIL_FOR_FINAL_PROSPECTS && !normalizeEmail(enriched.email)) {
      prospectsWithoutEmail += 1;
      continue;
    }

    const duplicate = isDuplicateProspect(
      enriched,
      [...state.prospects, ...eligibleProspects],
      state.sentLog,
      state.contactedProspects
    );

    if (duplicate) {
      enrichmentDuplicates += 1;
      continue;
    }

    eligibleProspects.push(enriched);
  }

  const finalProspects = selectFinalProspects(eligibleProspects);
  ensureRequiredTypes(finalProspects);

  return {
    finalProspects,
    enrichmentDuplicates,
    prospectsWithoutEmail,
  };
}

async function generateProspects() {
  console.log("[generateProspects] Iniciando generacion de prospectos...");

  const providerNames = getConfiguredProviders();
  const state = loadCrmState();
  const providerOptions = getProviderOptions([
    ...state.records,
  ]);

  const rawCandidates = await fetchCandidates(providerNames, providerOptions);
  const { uniqueProspects, duplicates } = filterUniqueProspects(
    rawCandidates,
    state.records
  );

  const scoredCandidates = uniqueProspects
    .map((prospect) => ({
      prospect,
      score: scoreProspect(prospect),
    }))
    .sort((left, right) => right.score - left.score);

  if (scoredCandidates.length < DESIRED_PROSPECT_COUNT) {
    throw new Error(
      `Se encontraron ${scoredCandidates.length} prospectos unicos, pero se necesitan ${DESIRED_PROSPECT_COUNT}.`
    );
  }

  const {
    finalProspects,
    enrichmentDuplicates,
    prospectsWithoutEmail,
  } = await buildFinalProspects(
    scoredCandidates,
    {
      prospects: state.records,
      sentLog: [],
      contactedProspects: [],
    }
  );

  const nextState = addGeneratedRecords(state.records, state.history, finalProspects);
  saveCrmState(nextState.records, nextState.history);

  console.log(`Busquedas ejecutadas: ${SEARCHES.length}`);
  console.log(`Resultados totales encontrados: ${rawCandidates.length}`);
  console.log(`Duplicados filtrados: ${duplicates.length + enrichmentDuplicates}`);
  console.log(`Prospectos sin email descartados: ${prospectsWithoutEmail}`);
  console.log(
    `Prospectos con email: ${finalProspects.filter((prospect) => prospect.email).length}`
  );
  console.log(`Prospectos finales guardados: ${finalProspects.length}`);

  return {
    searchesExecuted: SEARCHES.length,
    totalFound: rawCandidates.length,
    duplicatesFiltered: duplicates.length + enrichmentDuplicates,
    withoutEmailDiscarded: prospectsWithoutEmail,
    withEmail: finalProspects.filter((prospect) => prospect.email).length,
    savedProspects: finalProspects.length,
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
