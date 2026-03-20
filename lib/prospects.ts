import type { Prisma, ProspectStatus } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/db";
import { findDuplicate } from "@/lib/dedupe";
import { createManualProspect } from "@/lib/manual-prospects";
import { buildOpportunity } from "@/lib/opportunity";
import {
  buildProspectOutreachDraft,
  type OutreachMessageType,
} from "@/lib/outreach";
import { getProspectScoreCard } from "@/lib/prospect-scoring";
import {
  normalizeEmail,
  normalizeName,
  normalizePhone,
  normalizeProspectType,
  normalizeWhitespace,
} from "@/lib/normalizers";

const PROSPECT_STATUSES = [
  "generated",
  "analyzed",
  "approved",
  "ready",
  "contacted",
  "replied",
  "closed",
  "rejected",
] as const satisfies readonly ProspectStatus[];

const prospectListSelect = {
  id: true,
  name: true,
  contactName: true,
  city: true,
  email: true,
  phone: true,
  type: true,
  website: true,
  rating: true,
  mapsUrl: true,
  opportunity: true,
  recommendedSite: true,
  pitchAngle: true,
  subject: true,
  message: true,
  contacted: true,
  scheduledSendAt: true,
  lastContactedAt: true,
  followupCount: true,
  followupStage: true,
  status: true,
  source: true,
  createdAt: true,
  lastCheckedAt: true,
  updatedAt: true,
  businessStatus: true,
  lastError: true,
  lastMessageId: true,
  runId: true,
} satisfies Prisma.ProspectSelect;

const prospectDetailSelect = {
  ...prospectListSelect,
  run: {
    select: {
      id: true,
      source: true,
      status: true,
      createdAt: true,
    },
  },
  contactEvents: {
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      eventType: true,
      metadata: true,
      createdAt: true,
    },
  },
} satisfies Prisma.ProspectSelect;

type ProspectListRecord = Prisma.ProspectGetPayload<{
  select: typeof prospectListSelect;
}>;

type ProspectDetailRecord = Prisma.ProspectGetPayload<{
  select: typeof prospectDetailSelect;
}>;

export type ProspectActionPayload = {
  action?: string;
  ids?: string[];
  prospect?: {
    name?: string;
    contactName?: string;
    city?: string;
    email?: string;
    phone?: string;
    type?: string;
    website?: string;
  };
};

export type ProspectUpdateInput = {
  name?: string;
  contactName?: string;
  city?: string;
  email?: string;
  phone?: string;
  type?: string;
  website?: string;
  rating?: string;
  mapsUrl?: string;
  opportunity?: string;
  recommendedSite?: string;
  pitchAngle?: string;
  subject?: string;
  message?: string;
  contacted?: boolean;
  scheduledSendAt?: string | null;
  lastContactedAt?: string | null;
  followupCount?: number;
  followupStage?: number;
  businessStatus?: string;
  source?: string;
};

export type TransitionConfig = {
  fromStatuses?: ProspectStatus[];
  nextStatus: ProspectStatus;
  eventType: string;
  note: string;
  clearError?: boolean;
  data?: Prisma.ProspectUpdateInput;
};

function serializeProspect(record: ProspectListRecord) {
  const scoring = getProspectScoreCard(record);

  return {
    ...record,
    scheduledSendAt: record.scheduledSendAt ? record.scheduledSendAt.toISOString() : null,
    lastContactedAt: record.lastContactedAt ? record.lastContactedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    lastCheckedAt: record.lastCheckedAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    score: scoring.score,
    priority: scoring.priority,
  };
}

function hasStoredDraft(record: { subject: string; message: string }) {
  return Boolean(
    normalizeWhitespace(record.subject || "") && normalizeWhitespace(record.message || "")
  );
}

function shouldBeReady(
  record: Pick<
    ProspectListRecord,
    | "name"
    | "contactName"
    | "city"
    | "email"
    | "phone"
    | "type"
    | "website"
    | "rating"
    | "mapsUrl"
    | "opportunity"
    | "recommendedSite"
    | "pitchAngle"
    | "status"
    | "source"
    | "createdAt"
    | "lastCheckedAt"
    | "businessStatus"
    | "subject"
    | "message"
  >
) {
  const scoring = getProspectScoreCard(record);

  return scoring.priority === "alto" && hasStoredDraft(record);
}

function resolveStatusAfterApproval(record: ProspectListRecord): ProspectStatus {
  return shouldBeReady(record) ? "ready" : "approved";
}

function resolveStatusAfterDraft(record: ProspectListRecord): ProspectStatus {
  if (record.status === "approved" || record.status === "ready") {
    return shouldBeReady(record) ? "ready" : "approved";
  }

  if (
    record.status === "contacted" ||
    record.status === "replied" ||
    record.status === "closed" ||
    record.status === "rejected"
  ) {
    return record.status;
  }

  return "analyzed";
}

function serializeProspectDetail(record: ProspectDetailRecord) {
  return {
    ...serializeProspect(record),
    run: record.run
      ? {
          ...record.run,
          createdAt: record.run.createdAt.toISOString(),
        }
      : null,
    contactEvents: record.contactEvents.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

function normalizeWebsiteInput(value: string) {
  const website = normalizeWhitespace(value);

  if (!website) {
    return "";
  }

  if (/^https?:\/\//i.test(website)) {
    return website;
  }

  return `https://${website}`;
}

export function isProspectStatus(value: string): value is ProspectStatus {
  return PROSPECT_STATUSES.includes(value as ProspectStatus);
}

export function parseProspectStatus(value: string | null) {
  if (!value) {
    return null;
  }

  return isProspectStatus(value) ? value : null;
}

export function parseLimit(value: string | null, fallback = 20) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.min(parsed, 100);
}

export async function listProspects(options: {
  status?: ProspectStatus | null;
  limit?: number;
} = {}) {
  const prisma = getPrismaClient();
  const safeLimit = Number.isFinite(options.limit)
    ? Math.min(Math.max(Math.trunc(options.limit || 20), 1), 100)
    : 20;
  const where = options.status ? { status: options.status } : undefined;

  const prospects = await prisma.prospect.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: safeLimit,
    select: prospectListSelect,
  });

  return prospects.map(serializeProspect);
}

export async function getProspectDetail(id: string) {
  const prisma = getPrismaClient();
  const prospect = await prisma.prospect.findUnique({
    where: { id },
    select: prospectDetailSelect,
  });

  if (!prospect) {
    throw new Error("Prospecto no encontrado.");
  }

  return serializeProspectDetail(prospect);
}

export async function getProspectForMessage(id: string) {
  const prisma = getPrismaClient();
  const prospect = await prisma.prospect.findUnique({
    where: { id },
    select: prospectListSelect,
  });

  if (!prospect) {
    throw new Error("Prospecto no encontrado.");
  }

  return prospect;
}

export async function createProspect(input: {
  name?: string;
  contactName?: string;
  city?: string;
  email?: string;
  phone?: string;
  type?: string;
  website?: string;
}) {
  const prospect = await createManualProspect(input);

  return serializeProspect(prospect);
}

export async function transitionProspects(ids: string[], config: TransitionConfig) {
  if (!ids.length) {
    throw new Error("Selecciona al menos un registro.");
  }

  const prisma = getPrismaClient();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const records = await tx.prospect.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        status: true,
        lastError: true,
      },
    });

    const matchingRecords = records.filter((record) =>
      config.fromStatuses ? config.fromStatuses.includes(record.status) : true
    );

    if (!matchingRecords.length) {
      throw new Error("No hay registros validos para esa accion.");
    }

    for (const record of matchingRecords) {
      await tx.prospect.update({
        where: { id: record.id },
        data: {
          ...(config.data || {}),
          status: config.nextStatus,
          lastCheckedAt: now,
          lastError: config.clearError ? "" : record.lastError,
        },
      });

      await tx.contactEvent.create({
        data: {
          prospectId: record.id,
          eventType: config.eventType,
          createdAt: now,
          metadata: {
            fromStatus: record.status,
            toStatus: config.nextStatus,
            note: config.note,
          } as Prisma.InputJsonObject,
        },
      });
    }

    return {
      changed: matchingRecords.length,
      ids: matchingRecords.map((record) => record.id),
    };
  });
}

export async function transitionProspect(id: string, config: TransitionConfig) {
  const result = await transitionProspects([id], config);

  return {
    id,
    changed: result.changed,
    status: config.nextStatus,
  };
}

export async function updateProspect(id: string, input: ProspectUpdateInput) {
  const prisma = getPrismaClient();
  const current = await prisma.prospect.findUnique({
    where: { id },
    select: prospectListSelect,
  });

  if (!current) {
    throw new Error("Prospecto no encontrado.");
  }

  const data: Prisma.ProspectUpdateInput = {};

  if ("name" in input) {
    const value = normalizeWhitespace(input.name || "");

    if (!value) {
      throw new Error("El nombre no puede quedar vacio.");
    }

    data.name = value;
    data.normalizedName = normalizeName(value);
  }

  if ("contactName" in input) {
    data.contactName = normalizeWhitespace(input.contactName || "");
  }

  if ("city" in input) {
    const value = normalizeWhitespace(input.city || "");

    if (!value) {
      throw new Error("La ciudad no puede quedar vacia.");
    }

    data.city = value;
  }

  if ("email" in input) {
    const value = normalizeEmail(input.email || "");
    data.email = value;
    data.normalizedEmail = normalizeEmail(value);
  }

  if ("phone" in input) {
    const value = normalizePhone(input.phone || "");
    data.phone = value;
    data.normalizedPhone = normalizePhone(value);
  }

  if ("type" in input) {
    const value = normalizeProspectType(input.type || "");

    if (!value) {
      throw new Error("El tipo no puede quedar vacio.");
    }

    data.type = value;
  }

  if ("website" in input) {
    data.website = normalizeWebsiteInput(input.website || "");
  }

  if ("rating" in input) {
    data.rating = normalizeWhitespace(input.rating || "");
  }

  if ("mapsUrl" in input) {
    data.mapsUrl = normalizeWhitespace(input.mapsUrl || "");
  }

  if ("opportunity" in input) {
    data.opportunity = normalizeWhitespace(input.opportunity || "");
  }

  if ("recommendedSite" in input) {
    data.recommendedSite = normalizeWhitespace(input.recommendedSite || "");
  }

  if ("pitchAngle" in input) {
    data.pitchAngle = normalizeWhitespace(input.pitchAngle || "");
  }

  if ("subject" in input) {
    data.subject = normalizeWhitespace(input.subject || "");
  }

  if ("message" in input) {
    data.message = normalizeWhitespace(input.message || "");
  }

  if ("contacted" in input && typeof input.contacted === "boolean") {
    data.contacted = input.contacted;
  }

  if ("scheduledSendAt" in input) {
    data.scheduledSendAt = input.scheduledSendAt ? new Date(input.scheduledSendAt) : null;
  }

  if ("lastContactedAt" in input) {
    data.lastContactedAt = input.lastContactedAt ? new Date(input.lastContactedAt) : null;
  }

  if ("followupCount" in input) {
    const value = Number(input.followupCount);

    if (!Number.isInteger(value) || value < 0) {
      throw new Error("followupCount debe ser un entero mayor o igual a 0.");
    }

    data.followupCount = value;
  }

  if ("followupStage" in input) {
    const value = Number(input.followupStage);

    if (!Number.isInteger(value) || value < 0) {
      throw new Error("followupStage debe ser un entero mayor o igual a 0.");
    }

    data.followupStage = value;
  }

  if ("businessStatus" in input) {
    data.businessStatus = normalizeWhitespace(input.businessStatus || "");
  }

  if ("source" in input) {
    data.source = normalizeWhitespace(input.source || "");
  }

  const mergedType =
    typeof data.type === "string" ? data.type : current.type;
  const mergedWebsite =
    typeof data.website === "string" ? data.website : current.website;
  const derived = buildOpportunity({
    type: mergedType,
    website: mergedWebsite,
  });

  if (!("opportunity" in input)) {
    data.opportunity = derived.opportunity;
  }

  if (!("recommendedSite" in input)) {
    data.recommendedSite = derived.recommendedSite;
  }

  if (!("pitchAngle" in input)) {
    data.pitchAngle = derived.pitchAngle;
  }

  if (current.status === "approved" || current.status === "ready") {
    const nextSnapshot = {
      ...current,
      ...data,
      createdAt: current.createdAt,
      lastCheckedAt: current.lastCheckedAt,
    } as ProspectListRecord;
    data.status = shouldBeReady(nextSnapshot) ? "ready" : "approved";
  }

  if (!Object.keys(data).length) {
    throw new Error("No se enviaron campos editables.");
  }

  const duplicateCandidate = {
    name: String(data.name || current.name),
    email: String(data.email || current.email),
    phone: String(data.phone || current.phone),
  };
  const comparisonPool = await prisma.prospect.findMany({
    where: {
      id: {
        not: id,
      },
    },
    select: {
      name: true,
      email: true,
      phone: true,
    },
  });
  const duplicate = findDuplicate(duplicateCandidate, comparisonPool);

  if (duplicate) {
    throw new Error("Ya existe un prospecto similar con esos datos.");
  }

  const timestamp = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const prospect = await tx.prospect.update({
      where: { id },
      data: {
        ...data,
        lastCheckedAt: timestamp,
      },
      select: prospectListSelect,
    });

    await tx.contactEvent.create({
      data: {
        prospectId: id,
        eventType: "updated_manual",
        createdAt: timestamp,
        metadata: {
          note: "Prospect updated via API",
          changedFields: Object.keys(data),
        } as Prisma.InputJsonObject,
      },
    });

    return prospect;
  });

  return serializeProspect(updated);
}

export async function softDeleteProspect(id: string) {
  return transitionProspect(id, {
    nextStatus: "rejected",
    eventType: "rejected",
    note: "Record rejected via API",
  });
}

export async function approveProspect(id: string) {
  const prisma = getPrismaClient();
  const current = await prisma.prospect.findUnique({
    where: { id },
    select: prospectListSelect,
  });

  if (!current) {
    throw new Error("Prospecto no encontrado.");
  }

  if (!["generated", "analyzed", "approved", "ready"].includes(current.status)) {
    throw new Error("El prospecto no se puede aprobar desde su estado actual.");
  }

  const nextStatus = resolveStatusAfterApproval(current);
  const timestamp = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.prospect.update({
      where: { id },
      data: {
        status: nextStatus,
        lastCheckedAt: timestamp,
        lastError: "",
      },
    });

    await tx.contactEvent.create({
      data: {
        prospectId: id,
        eventType: "approval_reviewed",
        createdAt: timestamp,
        metadata: {
          fromStatus: current.status,
          toStatus: nextStatus,
          note: "Record approval reviewed through API",
        } as Prisma.InputJsonObject,
      },
    });
  });

  return {
    id,
    status: nextStatus,
  };
}

export async function rejectProspect(id: string) {
  return transitionProspect(id, {
    fromStatuses: ["generated", "analyzed", "approved", "ready"],
    nextStatus: "rejected",
    eventType: "rejected",
    note: "Record rejected through API",
    clearError: true,
  });
}

export async function storeProspectDraft(id: string, draft: { subject: string; message: string }) {
  const prisma = getPrismaClient();
  const current = await prisma.prospect.findUnique({
    where: { id },
    select: prospectListSelect,
  });

  if (!current) {
    throw new Error("Prospecto no encontrado.");
  }

  const subject = normalizeWhitespace(draft.subject || "");
  const message = normalizeWhitespace(draft.message || "");

  if (!subject || !message) {
    throw new Error("El borrador requiere subject y message.");
  }

  const nextSnapshot = {
    ...current,
    subject,
    message,
  };
  const nextStatus = resolveStatusAfterDraft(nextSnapshot);
  const timestamp = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const prospect = await tx.prospect.update({
      where: { id },
      data: {
        subject,
        message,
        status: nextStatus,
        lastCheckedAt: timestamp,
      },
      select: prospectListSelect,
    });

    await tx.contactEvent.create({
      data: {
        prospectId: id,
        eventType: "draft_generated",
        createdAt: timestamp,
        metadata: {
          fromStatus: current.status,
          toStatus: nextStatus,
          note: "Prospect draft generated and stored",
          subject,
        } as Prisma.InputJsonObject,
      },
    });

    return prospect;
  });

  return serializeProspect(updated);
}

export async function generateProspectDraft(
  id: string,
  type: OutreachMessageType = "first_contact"
) {
  const prospect = await getProspectForMessage(id);
  const draft = buildProspectOutreachDraft(prospect, type);
  const item = await storeProspectDraft(id, {
    subject: draft.subject,
    message: draft.message,
  });

  return {
    ...draft,
    item,
  };
}
