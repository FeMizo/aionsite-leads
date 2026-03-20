import fs from "node:fs";
import path from "node:path";
import type { Prisma } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/db";
import {
  normalizeEmail,
  normalizeName,
  normalizePhone,
  normalizeProspectType,
} from "@/lib/normalizers";

type LegacyRecord = {
  id: string;
  name?: string;
  businessName?: string;
  contactName?: string;
  email?: string;
  website?: string;
  phone?: string;
  category?: string;
  type?: string;
  city?: string;
  source?: string;
  status?: string;
  createdAt?: string;
  generatedAt?: string;
  updatedAt?: string;
  sentAt?: string;
  lastError?: string;
  rating?: string;
  mapsUrl?: string;
  opportunity?: string;
  recommendedSite?: string;
  pitchAngle?: string;
  businessStatus?: string;
  lastMessageId?: string;
};

type LegacyHistoryEntry = {
  id: string;
  recordId: string;
  action?: string;
  at?: string;
  note?: string;
  error?: string;
  meta?: Record<string, unknown>;
  fromStatus?: string;
  toStatus?: string;
};

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  const raw = fs.readFileSync(filePath, "utf8").trim();

  if (!raw) {
    return fallback;
  }

  return JSON.parse(raw) as T;
}

function resolveDataFile(fileName: string) {
  return path.join(process.cwd(), "data", fileName);
}

function toProspectStatus(status: string | undefined) {
  switch (status) {
    case "generated":
    case "analyzed":
    case "approved":
    case "ready":
    case "contacted":
    case "replied":
    case "closed":
    case "rejected":
      return status;
    case "prospect":
      return "approved";
    case "failed":
    case "archived":
    case "deleted":
      return "rejected";
    default:
      return "generated";
  }
}

export async function importLegacyJsonData(options: { force?: boolean } = {}) {
  const prisma = getPrismaClient();
  const prospectsInDb = await prisma.prospect.count();

  if (prospectsInDb > 0 && !options.force) {
    return {
      importedProspects: 0,
      importedEvents: 0,
      skipped: true,
    };
  }

  const records = readJsonFile<LegacyRecord[]>(resolveDataFile("crm-records.json"), []);
  const history = readJsonFile<LegacyHistoryEntry[]>(
    resolveDataFile("history.json"),
    []
  );

  if (!records.length) {
    return {
      importedProspects: 0,
      importedEvents: 0,
      skipped: false,
    };
  }

  const syntheticRun = await prisma.run.create({
    data: {
      source: "legacy-json",
      searchesCount: 0,
      placesFound: records.length,
      duplicatesFiltered: 0,
      emailsFound: records.filter((record) => normalizeEmail(record.email || "")).length,
      prospectsSaved: records.length,
      googlePlacesRequests: 0,
      websiteFetches: 0,
      status: "completed",
    },
  });

  for (const record of records) {
    const status = toProspectStatus(record.status);

    await prisma.prospect.upsert({
      where: { id: record.id },
      update: {
        name: record.businessName || record.name || "",
        normalizedName: normalizeName(record.businessName || record.name || ""),
        contactName: record.contactName || "",
        city: record.city || "",
        email: record.email || "",
        normalizedEmail: normalizeEmail(record.email || ""),
        phone: record.phone || "",
        normalizedPhone: normalizePhone(record.phone || ""),
        type: normalizeProspectType(record.type || record.category || ""),
        website: record.website || "",
        rating: record.rating || "",
        mapsUrl: record.mapsUrl || "",
        opportunity: record.opportunity || "",
        recommendedSite: record.recommendedSite || "",
        pitchAngle: record.pitchAngle || "",
        subject: "",
        message: "",
        contacted: ["contacted", "replied", "closed"].includes(status),
        lastContactedAt:
          ["contacted", "replied", "closed"].includes(status)
            ? new Date(record.sentAt || record.updatedAt || record.createdAt || new Date())
            : null,
        followupCount: 0,
        followupStage: ["contacted", "replied", "closed"].includes(status) ? 1 : 0,
        status,
        source: record.source || "legacy-json",
        createdAt: new Date(record.createdAt || record.generatedAt || new Date()),
        lastCheckedAt: new Date(
          record.updatedAt || record.sentAt || record.createdAt || new Date()
        ),
        businessStatus: record.businessStatus || "",
        lastError: record.lastError || "",
        lastMessageId: record.lastMessageId || "",
        runId: syntheticRun.id,
      },
      create: {
        id: record.id,
        name: record.businessName || record.name || "",
        normalizedName: normalizeName(record.businessName || record.name || ""),
        contactName: record.contactName || "",
        city: record.city || "",
        email: record.email || "",
        normalizedEmail: normalizeEmail(record.email || ""),
        phone: record.phone || "",
        normalizedPhone: normalizePhone(record.phone || ""),
        type: normalizeProspectType(record.type || record.category || ""),
        website: record.website || "",
        rating: record.rating || "",
        mapsUrl: record.mapsUrl || "",
        opportunity: record.opportunity || "",
        recommendedSite: record.recommendedSite || "",
        pitchAngle: record.pitchAngle || "",
        subject: "",
        message: "",
        contacted: ["contacted", "replied", "closed"].includes(status),
        lastContactedAt:
          ["contacted", "replied", "closed"].includes(status)
            ? new Date(record.sentAt || record.updatedAt || record.createdAt || new Date())
            : null,
        followupCount: 0,
        followupStage: ["contacted", "replied", "closed"].includes(status) ? 1 : 0,
        status,
        source: record.source || "legacy-json",
        createdAt: new Date(record.createdAt || record.generatedAt || new Date()),
        lastCheckedAt: new Date(
          record.updatedAt || record.sentAt || record.createdAt || new Date()
        ),
        businessStatus: record.businessStatus || "",
        lastError: record.lastError || "",
        lastMessageId: record.lastMessageId || "",
        runId: syntheticRun.id,
      },
    });
  }

  for (const event of history) {
    await prisma.contactEvent.upsert({
      where: { id: event.id },
      update: {
        eventType: event.action || "legacy_event",
        metadata: {
          fromStatus: event.fromStatus || "",
          toStatus: event.toStatus || "",
          note: event.note || "",
          error: event.error || "",
          ...(event.meta || {}),
        } as Prisma.InputJsonObject,
        createdAt: new Date(event.at || new Date()),
      },
      create: {
        id: event.id,
        prospectId: event.recordId,
        eventType: event.action || "legacy_event",
        metadata: {
          fromStatus: event.fromStatus || "",
          toStatus: event.toStatus || "",
          note: event.note || "",
          error: event.error || "",
          ...(event.meta || {}),
        } as Prisma.InputJsonObject,
        createdAt: new Date(event.at || new Date()),
      },
    });
  }

  return {
    importedProspects: records.length,
    importedEvents: history.length,
    skipped: false,
  };
}
