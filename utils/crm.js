const path = require("path");
const { randomUUID } = require("crypto");
const { findDuplicate } = require("./dedupe");
const { dataPaths, ensureFile, readJson, writeJson } = require("./storage");

const DATA_DIR = path.dirname(dataPaths.prospects);
const crmPaths = {
  records: path.join(DATA_DIR, "crm-records.json"),
  history: path.join(DATA_DIR, "history.json"),
  generatedProjection: path.join(DATA_DIR, "generated-prospects.json"),
};

const ACTIVE_PROSPECT_STATUSES = ["prospect", "failed"];
const CONTACTED_STATUSES = ["contacted", "replied", "closed"];
const TERMINAL_STATUSES = ["contacted", "replied", "closed", "archived", "deleted"];
const CONTACT_EXPIRATION_DAYS = 30;

function nowIso() {
  return new Date().toISOString();
}

function buildRecordId() {
  return randomUUID();
}

function normalizeCrmStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();

  if (!normalized) {
    return "generated";
  }

  if (normalized === "pending") {
    return "prospect";
  }

  if (normalized === "sent") {
    return "contacted";
  }

  return normalized;
}

function buildCrmRecord(input = {}, fallbackStatus = "generated") {
  const createdAt = input.createdAt || input.generatedAt || nowIso();
  const status = normalizeCrmStatus(input.status || fallbackStatus);

  return {
    id: input.id || buildRecordId(),
    name: input.name || input.businessName || "",
    businessName: input.businessName || input.name || "",
    contactName: input.contactName || "",
    email: input.email || "",
    website: input.website || "",
    phone: input.phone || "",
    category: input.category || input.type || "",
    type: input.type || input.category || "",
    city: input.city || "",
    source: input.source || "",
    status,
    createdAt,
    generatedAt: input.generatedAt || createdAt,
    updatedAt: input.updatedAt || input.lastCheckedAt || createdAt,
    sentAt: input.sentAt || "",
    notes: input.notes || "",
    lastError: input.lastError || input.lastSendError || "",
    rating: input.rating || "",
    mapsUrl: input.mapsUrl || "",
    opportunity: input.opportunity || "",
    recommendedSite: input.recommendedSite || "",
    pitchAngle: input.pitchAngle || "",
    businessStatus: input.businessStatus || "",
    lastMessageId: input.lastMessageId || "",
  };
}

function buildHistoryEntry(record, action, detail = {}) {
  return {
    id: buildRecordId(),
    recordId: record.id,
    businessName: record.businessName || record.name || "",
    fromStatus: detail.fromStatus || "",
    toStatus: detail.toStatus || record.status,
    action,
    at: detail.at || nowIso(),
    note: detail.note || "",
    error: detail.error || "",
    meta: detail.meta || {},
  };
}

function isExpiredContact(record, referenceDate = new Date()) {
  if (record.status !== "contacted" || !record.sentAt) {
    return false;
  }

  const contactedAt = new Date(record.sentAt);

  if (Number.isNaN(contactedAt.getTime())) {
    return false;
  }

  const elapsedMs = referenceDate.getTime() - contactedAt.getTime();
  const expirationMs = CONTACT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

  return elapsedMs >= expirationMs;
}

function applyLifecycleRules(records, history) {
  const nextHistory = [...history];
  const now = new Date();
  let changed = false;

  const nextRecords = records.map((record) => {
    if (!isExpiredContact(record, now)) {
      return record;
    }

    changed = true;

    const updated = {
      ...record,
      status: "failed",
      updatedAt: now.toISOString(),
      lastError: `No reply after ${CONTACT_EXPIRATION_DAYS} days from contacted date`,
    };

    nextHistory.push(
      buildHistoryEntry(updated, "contact_expired", {
        fromStatus: record.status,
        toStatus: "failed",
        at: updated.updatedAt,
        note: `Moved to failed after ${CONTACT_EXPIRATION_DAYS} days without response`,
        error: updated.lastError,
        meta: {
          source: updated.source,
          city: updated.city,
          email: updated.email,
          phone: updated.phone,
          category: updated.category,
          createdAt: updated.createdAt,
          messageId: updated.lastMessageId || "",
        },
      })
    );

    return updated;
  });

  return {
    changed,
    records: nextRecords,
    history: nextHistory,
  };
}

function ensureCrmFiles() {
  ensureFile(crmPaths.records, []);
  ensureFile(crmPaths.history, []);
  ensureFile(crmPaths.generatedProjection, []);
}

function mergeLegacyRecord(collection, candidate, preferredStatus) {
  const duplicate = findDuplicate(candidate, collection);

  if (!duplicate) {
    collection.push(
      buildCrmRecord({ ...candidate, status: preferredStatus }, preferredStatus)
    );
    return;
  }

  const existing = duplicate.existing;
  const nextStatus =
    CONTACTED_STATUSES.includes(preferredStatus) ||
    preferredStatus === "contacted" ||
    existing.status === "contacted"
      ? "contacted"
      : normalizeCrmStatus(existing.status || preferredStatus);

  Object.assign(existing, buildCrmRecord({ ...existing, ...candidate, id: existing.id }, nextStatus));
}

function migrateLegacyData() {
  const existingRecords = readJson(crmPaths.records, []);

  if (existingRecords.length) {
    return;
  }

  const prospects = readJson(dataPaths.prospects, []);
  const contacted = readJson(dataPaths.contactedProspects, []);
  const sentLog = readJson(dataPaths.sentLog, []);
  const records = [];
  const history = [];

  for (const record of contacted) {
    mergeLegacyRecord(
      records,
      record,
      record.status === "pending" ? "generated" : record.status || "contacted"
    );

    if (Array.isArray(record.history)) {
      const crmRecord = findDuplicate(record, records)?.existing;

      if (crmRecord) {
        for (const event of record.history) {
          history.push(
            buildHistoryEntry(crmRecord, event.status || "status_change", {
              at: event.at,
              toStatus: normalizeCrmStatus(event.status || crmRecord.status),
              note: event.note || "",
              meta: event.messageId ? { messageId: event.messageId } : {},
            })
          );
        }
      }
    }
  }

  for (const record of prospects) {
    mergeLegacyRecord(records, record, record.status || "prospect");
  }

  for (const event of sentLog) {
    const crmRecord = findDuplicate(event, records)?.existing;

    if (!crmRecord) {
      continue;
    }

    history.push(
      buildHistoryEntry(crmRecord, event.status || "send_event", {
        at: event.eventAt || event.createdAt || nowIso(),
        toStatus:
          event.status === "sent" ? "contacted" : normalizeCrmStatus(event.status),
        error: event.error || "",
        meta: event.messageId ? { messageId: event.messageId } : {},
      })
    );
  }

  writeJson(crmPaths.records, records);
  writeJson(crmPaths.history, history);
}

function syncLegacyProjections(records, history) {
  const generated = records.filter((record) => record.status === "generated");
  const prospects = records.filter((record) =>
    ACTIVE_PROSPECT_STATUSES.includes(record.status)
  );
  const contacted = records.filter((record) =>
    CONTACTED_STATUSES.includes(record.status)
  );
  const sentLog = history
    .filter((entry) =>
      ["send_success", "send_error", "invalid_email", "duplicate_skip"].includes(
        entry.action
      )
    )
    .map((entry) => ({
      name: entry.businessName,
      city: entry.meta.city || "",
      email: entry.meta.email || "",
      phone: entry.meta.phone || "",
      type: entry.meta.category || "",
      status:
        entry.action === "send_success"
          ? "sent"
          : entry.action === "send_error"
          ? "send_error"
          : entry.action,
      source: entry.meta.source || "",
      messageId: entry.meta.messageId || "",
      error: entry.error || "",
      createdAt: entry.meta.createdAt || entry.at,
      eventAt: entry.at,
    }));

  writeJson(crmPaths.generatedProjection, generated);
  writeJson(dataPaths.prospects, prospects);
  writeJson(dataPaths.contactedProspects, contacted);
  writeJson(dataPaths.sentLog, sentLog);
}

function loadCrmState() {
  ensureCrmFiles();
  migrateLegacyData();

  const persistedRecords = readJson(crmPaths.records, []);
  const persistedHistory = readJson(crmPaths.history, []);
  const lifecycleState = applyLifecycleRules(persistedRecords, persistedHistory);
  const records = lifecycleState.records;
  const history = lifecycleState.history;

  if (lifecycleState.changed) {
    writeJson(crmPaths.records, records);
    writeJson(crmPaths.history, history);
  }

  syncLegacyProjections(records, history);

  return {
    records,
    history,
    generated: records.filter((record) => record.status === "generated"),
    prospects: records.filter((record) =>
      ACTIVE_PROSPECT_STATUSES.includes(record.status)
    ),
    contacted: records.filter((record) =>
      CONTACTED_STATUSES.includes(record.status)
    ),
    failed: records.filter((record) => record.status === "failed"),
  };
}

function saveCrmState(records, history) {
  writeJson(crmPaths.records, records);
  writeJson(crmPaths.history, history);
  syncLegacyProjections(records, history);
}

function appendHistory(history, entries) {
  return [...history, ...entries];
}

function addGeneratedRecords(records, history, prospects) {
  const nextRecords = [...records];
  const entries = [];

  for (const prospect of prospects) {
    const record = buildCrmRecord(
      {
        ...prospect,
        status: "generated",
        generatedAt: prospect.generatedAt || prospect.createdAt || nowIso(),
      },
      "generated"
    );
    nextRecords.push(record);
    entries.push(
      buildHistoryEntry(record, "generated", {
        toStatus: "generated",
        note: "Prospect generated and queued for review",
        meta: {
          source: record.source,
          city: record.city,
          email: record.email,
          phone: record.phone,
          category: record.category,
          createdAt: record.createdAt,
        },
      })
    );
  }

  return {
    records: nextRecords,
    history: appendHistory(history, entries),
  };
}

function transitionRecords(records, history, ids, toStatus, options = {}) {
  const idsSet = new Set(ids);
  const nextHistory = [...history];
  const nextRecords = records.map((record) => {
    if (!idsSet.has(record.id)) {
      return record;
    }

    const fromStatus = record.status;
    const nextRecord = {
      ...record,
      status: toStatus,
      updatedAt: nowIso(),
    };

    if (toStatus === "contacted") {
      nextRecord.sentAt = options.sentAt || record.sentAt || nowIso();
    }

    if (options.lastError !== undefined) {
      nextRecord.lastError = options.lastError;
    }

    if (options.notes) {
      nextRecord.notes = options.notes;
    }

    nextHistory.push(
      buildHistoryEntry(nextRecord, options.action || "status_changed", {
        fromStatus,
        toStatus,
        note: options.note || "",
        error: options.error || "",
        meta: {
          source: nextRecord.source,
          city: nextRecord.city,
          email: nextRecord.email,
          phone: nextRecord.phone,
          category: nextRecord.category,
          createdAt: nextRecord.createdAt,
          messageId: options.messageId || nextRecord.lastMessageId || "",
        },
      })
    );

    return nextRecord;
  });

  return { records: nextRecords, history: nextHistory };
}

function getRecordByIds(records, ids) {
  const idsSet = new Set(ids);
  return records.filter((record) => idsSet.has(record.id));
}

function getOverviewMetrics(state) {
  const totalSent = state.history.filter((entry) => entry.action === "send_success")
    .length;

  return {
    generated: state.generated.length,
    prospects: state.prospects.filter((record) => record.status === "prospect").length,
    contacted: state.contacted.length,
    failed: state.failed.length,
    totalSent,
  };
}

module.exports = {
  ACTIVE_PROSPECT_STATUSES,
  CONTACTED_STATUSES,
  TERMINAL_STATUSES,
  addGeneratedRecords,
  buildCrmRecord,
  buildHistoryEntry,
  crmPaths,
  getOverviewMetrics,
  getRecordByIds,
  loadCrmState,
  normalizeCrmStatus,
  saveCrmState,
  transitionRecords,
};
