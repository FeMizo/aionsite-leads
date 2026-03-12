const fs = require("fs");
const path = require("path");
const { findDuplicate } = require("./dedupe");

function resolveDataDir() {
  const configuredDir = process.env.AIONSITE_DATA_DIR || "data";

  if (path.isAbsolute(configuredDir)) {
    return configuredDir;
  }

  // Next bundles server code under .next, so __dirname is not stable here.
  return path.resolve(process.cwd(), configuredDir);
}

const DATA_DIR = resolveDataDir();

const dataPaths = {
  prospects: path.join(DATA_DIR, "prospects.json"),
  contactedProspects: path.join(DATA_DIR, "contacted-prospects.json"),
  sentLog: path.join(DATA_DIR, "sent-log.json"),
};

const prospectFields = [
  "name",
  "contactName",
  "city",
  "email",
  "phone",
  "type",
  "website",
  "rating",
  "mapsUrl",
  "opportunity",
  "recommendedSite",
  "pitchAngle",
  "source",
  "businessStatus",
  "createdAt",
  "lastCheckedAt",
  "status",
  "sentAt",
  "lastMessageId",
  "lastSendError",
];

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, value) {
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonArray(filePath, value) {
  writeJson(filePath, value);
}

function ensureFile(filePath, defaultData = []) {
  if (!fs.existsSync(filePath)) {
    writeJson(filePath, defaultData);
  }
}

function ensureJsonArrayFile(filePath) {
  ensureFile(filePath, []);
}

function readJson(filePath, fallback = []) {
  ensureFile(filePath, fallback);
  const raw = fs.readFileSync(filePath, "utf8").trim();

  if (!raw) {
    return fallback;
  }

  return JSON.parse(raw);
}

function readJsonArray(filePath) {
  const parsed = readJson(filePath, []);

  if (!Array.isArray(parsed)) {
    throw new Error(`El archivo ${filePath} debe contener un arreglo JSON.`);
  }

  return parsed;
}

function ensureDataFiles() {
  ensureJsonArrayFile(dataPaths.prospects);
  ensureJsonArrayFile(dataPaths.contactedProspects);
  ensureJsonArrayFile(dataPaths.sentLog);
}

function loadCrmState() {
  ensureDataFiles();

  return {
    prospects: readJsonArray(dataPaths.prospects),
    contactedProspects: readJsonArray(dataPaths.contactedProspects),
    sentLog: readJsonArray(dataPaths.sentLog),
  };
}

function saveProspects(prospects) {
  writeJsonArray(dataPaths.prospects, prospects);
}

function saveContactedProspects(contactedProspects) {
  writeJsonArray(dataPaths.contactedProspects, contactedProspects);
}

function saveSentLog(sentLog) {
  writeJsonArray(dataPaths.sentLog, sentLog);
}

function appendHistory(history, status, note, at, meta) {
  const nextEntry = {
    status,
    at,
  };

  if (note) {
    nextEntry.note = note;
  }

  if (meta && typeof meta === "object") {
    Object.assign(nextEntry, meta);
  }

  const nextHistory = Array.isArray(history) ? [...history] : [];
  const lastEntry = nextHistory[nextHistory.length - 1];

  if (
    lastEntry &&
    lastEntry.status === nextEntry.status &&
    lastEntry.note === nextEntry.note &&
    lastEntry.messageId === nextEntry.messageId
  ) {
    return nextHistory;
  }

  nextHistory.push(nextEntry);
  return nextHistory;
}

function buildContactedProspect(prospect, options) {
  const at = options.at || prospect.createdAt || new Date().toISOString();
  const status = options.status || prospect.status || "pending";

  return {
    name: prospect.name || "",
    contactName: prospect.contactName || "",
    city: prospect.city || "",
    email: prospect.email || "",
    phone: prospect.phone || "",
    type: prospect.type || "",
    website: prospect.website || "",
    rating: prospect.rating || "",
    mapsUrl: prospect.mapsUrl || "",
    opportunity: prospect.opportunity || "",
    recommendedSite: prospect.recommendedSite || "",
    pitchAngle: prospect.pitchAngle || "",
    source: prospect.source || "",
    businessStatus: prospect.businessStatus || "",
    createdAt: prospect.createdAt || at,
    lastCheckedAt: prospect.lastCheckedAt || at,
    status,
    history: appendHistory(
      [],
      status,
      options.note || "Prospect created",
      at,
      options.meta
    ),
  };
}

function mergeContactedProspect(existing, prospect, options) {
  const merged = {
    ...existing,
  };

  for (const field of prospectFields) {
    const value = prospect[field];

    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === "string" && !value.trim()) {
      continue;
    }

    merged[field] = typeof value === "string" ? value.trim() : value;
  }

  merged.createdAt = existing.createdAt || prospect.createdAt || options.at;
  merged.lastCheckedAt =
    options.at || prospect.lastCheckedAt || existing.lastCheckedAt;
  merged.status = options.status || prospect.status || existing.status || "pending";
  merged.history = Array.isArray(existing.history) ? [...existing.history] : [];

  if (
    !merged.history.length ||
    options.note ||
    merged.history[merged.history.length - 1].status !== merged.status
  ) {
    merged.history = appendHistory(
      merged.history,
      merged.status,
      options.note,
      options.at || merged.lastCheckedAt || new Date().toISOString(),
      options.meta
    );
  }

  return merged;
}

function upsertContactedProspect(contactedProspects, prospect, options = {}) {
  const at = options.at || prospect.lastCheckedAt || new Date().toISOString();
  const duplicate = findDuplicate(prospect, contactedProspects);

  if (!duplicate) {
    const record = buildContactedProspect(prospect, {
      ...options,
      at,
    });

    return {
      list: [...contactedProspects, record],
      record,
      created: true,
    };
  }

  const record = mergeContactedProspect(duplicate.existing, prospect, {
    ...options,
    at,
  });

  return {
    list: contactedProspects.map((item) =>
      item === duplicate.existing ? record : item
    ),
    record,
    created: false,
    duplicateReason: duplicate.reason,
  };
}

function syncContactedProspects(contactedProspects, prospects) {
  let nextContactedProspects = [...contactedProspects];

  for (const prospect of prospects) {
    nextContactedProspects = upsertContactedProspect(
      nextContactedProspects,
      prospect,
      {
        status: prospect.status || "pending",
        at: prospect.lastCheckedAt || prospect.createdAt || new Date().toISOString(),
      }
    ).list;
  }

  return nextContactedProspects;
}

function appendSentLogEntry(sentLog, prospect, options = {}) {
  const at = options.at || new Date().toISOString();

  return [
    ...sentLog,
    {
      name: prospect.name || "",
      city: prospect.city || "",
      email: prospect.email || "",
      phone: prospect.phone || "",
      type: prospect.type || "",
      mapsUrl: prospect.mapsUrl || "",
      status: options.status || prospect.status || "pending",
      source: prospect.source || "",
      businessStatus: prospect.businessStatus || "",
      messageId: options.messageId || "",
      error: options.error || "",
      createdAt: prospect.createdAt || at,
      eventAt: at,
    },
  ];
}

module.exports = {
  appendSentLogEntry,
  dataPaths,
  ensureDataFiles,
  ensureFile,
  loadCrmState,
  readJson,
  readJsonArray,
  saveContactedProspects,
  saveProspects,
  saveSentLog,
  syncContactedProspects,
  upsertContactedProspect,
  writeJson,
  writeJsonArray,
};
