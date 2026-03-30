import type { Prisma, Prospect } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/db";
import {
  getMexicoCityDayBounds,
  addTimeZoneDays,
  createTimeZoneDate,
  getTimeZoneParts,
} from "@/lib/mexico-city-time";
import { getProspectTimeZone } from "@/lib/prospect-timezone";
import { getProspectScoreCard, type ProspectPriority } from "@/lib/prospect-scoring";

export const SEND_WINDOWS = [
  { startHour: 8, startMinute: 0, endHour: 10, endMinute: 0 },
  { startHour: 12, startMinute: 30, endHour: 14, endMinute: 0 },
] as const;

export const SEND_WINDOW_SLOTS = [
  { hour: 8, minute: 0 },
  { hour: 8, minute: 30 },
  { hour: 9, minute: 0 },
  { hour: 9, minute: 30 },
  { hour: 10, minute: 0 },
  { hour: 12, minute: 30 },
  { hour: 13, minute: 0 },
  { hour: 13, minute: 30 },
  { hour: 14, minute: 0 },
] as const;

export const MAX_PER_RUN = 3;
export const MAX_PER_DAY = 15;
export const MAX_PER_SCHEDULED_SLOT = 3;

const ACTIVE_SCHEDULED_STATUSES = ["ready", "contacted"] as const;

type SchedulableProspect = Pick<Prospect, "type" | "city" | "scheduledSendAt">;

type PrioritizedProspect = Pick<Prospect, "type" | "city" | "createdAt" | "scheduledSendAt"> & {
  score?: number;
  priority?: ProspectPriority;
  website?: string;
  email?: string;
  phone?: string;
  mapsUrl?: string;
};

function toMinutes(hour: number, minute: number) {
  return hour * 60 + minute;
}

function getReferenceMinutes(referenceDate: Date, timeZone: string) {
  const parts = getTimeZoneParts(referenceDate, timeZone);
  return toMinutes(parts.hour, parts.minute);
}

function isWithinSendWindow(referenceDate: Date, timeZone: string) {
  const minutes = getReferenceMinutes(referenceDate, timeZone);

  return SEND_WINDOWS.some((window) => {
    const start = toMinutes(window.startHour, window.startMinute);
    const end = toMinutes(window.endHour, window.endMinute);

    return minutes >= start && minutes <= end;
  });
}

function isAvoidedSendWindow(referenceDate: Date, timeZone: string) {
  const minutes = getReferenceMinutes(referenceDate, timeZone);

  return minutes >= toMinutes(15, 0) && minutes <= toMinutes(18, 59);
}

function alignToNextDeliverySlot(referenceDate: Date, timeZone: string) {
  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const baseDate = addTimeZoneDays(referenceDate, dayOffset, timeZone, {
      hour: 0,
      minute: 0,
      second: 0,
    });

    for (const slot of SEND_WINDOW_SLOTS) {
      const parts = getTimeZoneParts(baseDate, timeZone);
      const candidate = createTimeZoneDate({
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: slot.hour,
        minute: slot.minute,
        second: 0,
      }, timeZone);

      if (candidate.getTime() > referenceDate.getTime()) {
        return candidate;
      }
    }
  }

  const fallback = addTimeZoneDays(referenceDate, 1, timeZone, {
    hour: SEND_WINDOW_SLOTS[0].hour,
    minute: SEND_WINDOW_SLOTS[0].minute,
    second: 0,
  });

  return fallback;
}

function isExactDeliverySlot(referenceDate: Date, timeZone: string) {
  const parts = getTimeZoneParts(referenceDate, timeZone);

  if (parts.second !== 0) {
    return false;
  }

  return SEND_WINDOW_SLOTS.some(
    (slot) => slot.hour === parts.hour && slot.minute === parts.minute
  );
}

export function normalizeScheduledSendAt(
  referenceDate: Date,
  timeZone = getProspectTimeZone()
) {
  if (Number.isNaN(referenceDate.getTime())) {
    throw new Error("La fecha programada no es valida.");
  }

  if (isExactDeliverySlot(referenceDate, timeZone)) {
    const parts = getTimeZoneParts(referenceDate, timeZone);

    return createTimeZoneDate({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: parts.hour,
      minute: parts.minute,
      second: 0,
    }, timeZone);
  }

  return alignToNextDeliverySlot(new Date(referenceDate.getTime() - 1000), timeZone);
}

export function isScheduledSendAligned(
  referenceDate: Date,
  timeZone = getProspectTimeZone()
) {
  if (Number.isNaN(referenceDate.getTime())) {
    return false;
  }

  return normalizeScheduledSendAt(referenceDate, timeZone).getTime() === referenceDate.getTime();
}

function normalizePriorityWeight(priority: ProspectPriority | undefined) {
  if (priority === "alto") {
    return 3;
  }

  if (priority === "medio") {
    return 2;
  }

  return 1;
}

export function sortProspectsForDelivery<T extends PrioritizedProspect>(prospects: T[]) {
  return [...prospects].sort((left, right) => {
    const leftScoreInput = {
      website: left.website || "",
      type: left.type,
      email: left.email || "",
      phone: left.phone || "",
      mapsUrl: left.mapsUrl || "",
    };
    const rightScoreInput = {
      website: right.website || "",
      type: right.type,
      email: right.email || "",
      phone: right.phone || "",
      mapsUrl: right.mapsUrl || "",
    };
    const leftCard =
      typeof left.score === "number" && left.priority
        ? { score: left.score, priority: left.priority }
        : getProspectScoreCard(leftScoreInput);
    const rightCard =
      typeof right.score === "number" && right.priority
        ? { score: right.score, priority: right.priority }
        : getProspectScoreCard(rightScoreInput);
    const priorityDiff =
      normalizePriorityWeight(rightCard.priority) -
      normalizePriorityWeight(leftCard.priority);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    if (leftCard.score !== rightCard.score) {
      return rightCard.score - leftCard.score;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });
}

export function isGoodTimeToSend(
  prospect: Pick<SchedulableProspect, "type" | "city"> | { type: string; city?: string | null },
  referenceDate = new Date()
) {
  const timeZone = getProspectTimeZone(prospect.city);
  const minutes = getReferenceMinutes(referenceDate, timeZone);

  if (minutes < toMinutes(8, 0)) {
    return false;
  }

  if (isAvoidedSendWindow(referenceDate, timeZone)) {
    return false;
  }

  return isWithinSendWindow(referenceDate, timeZone);
}

export function isScheduledSendDue(
  prospect: Pick<SchedulableProspect, "scheduledSendAt"> | { scheduledSendAt: Date | null },
  referenceDate = new Date()
) {
  if (!prospect.scheduledSendAt) {
    return true;
  }

  return prospect.scheduledSendAt.getTime() <= referenceDate.getTime();
}

export function getNextRecommendedSendAt(
  prospect: Pick<SchedulableProspect, "type" | "city"> | { type: string; city?: string | null },
  referenceDate = new Date()
) {
  const timeZone = getProspectTimeZone(prospect.city);
  return normalizeScheduledSendAt(alignToNextDeliverySlot(referenceDate, timeZone), timeZone);
}

async function countScheduledProspectsForSlot(
  scheduledSendAt: Date,
  options: {
    excludeProspectId?: string;
  } = {}
) {
  const prisma = getPrismaClient();

  return prisma.prospect.count({
    where: {
      status: {
        in: [...ACTIVE_SCHEDULED_STATUSES],
      },
      scheduledSendAt,
      ...(options.excludeProspectId
        ? {
            id: {
              not: options.excludeProspectId,
            },
          }
        : {}),
    },
  });
}

export async function getNextAvailableScheduledSendAt(
  prospect: Pick<SchedulableProspect, "type" | "city"> | { type: string; city?: string | null },
  referenceDate = new Date(),
  options: {
    excludeProspectId?: string;
  } = {}
) {
  const timeZone = getProspectTimeZone(prospect.city);
  let candidate = normalizeScheduledSendAt(referenceDate, timeZone);

  for (let attempt = 0; attempt < 126; attempt += 1) {
    const scheduledCount = await countScheduledProspectsForSlot(candidate, options);

    if (scheduledCount < MAX_PER_SCHEDULED_SLOT) {
      return candidate;
    }

    candidate = getNextRecommendedSendAt(prospect, candidate);
  }

  throw new Error("No se pudo encontrar un horario disponible para el envio programado.");
}

export async function countEmailsSentToday(referenceDate = new Date()) {
  const prisma = getPrismaClient();
  const { start, end } = getMexicoCityDayBounds(referenceDate);

  return prisma.contactEvent.count({
    where: {
      eventType: {
        in: ["send_success", "followup_1_sent", "followup_2_sent", "followup_3_sent"],
      },
      createdAt: {
        gte: start,
        lt: end,
      },
    },
  });
}

export async function scheduleSend(prospectId: string, scheduledAtInput: string) {
  const prisma = getPrismaClient();
  const requestedDate = new Date(scheduledAtInput);

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
  });

  if (!prospect) {
    throw new Error("Prospecto no encontrado.");
  }

  const scheduledSendAt = await getNextAvailableScheduledSendAt(prospect, requestedDate, {
    excludeProspectId: prospect.id,
  });

  if (scheduledSendAt.getTime() <= Date.now()) {
    throw new Error("La fecha programada debe estar en el futuro.");
  }

  if (!isGoodTimeToSend(prospect, scheduledSendAt)) {
    throw new Error(
      "La fecha programada cae fuera de las ventanas permitidas de envio."
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.prospect.update({
      where: { id: prospectId },
      data: {
        scheduledSendAt,
        lastCheckedAt: new Date(),
      },
    });

    await tx.contactEvent.create({
      data: {
        prospectId,
        eventType: "send_scheduled",
        metadata: {
          note: "Prospect send scheduled manually",
          scheduledSendAt: scheduledSendAt.toISOString(),
        } as Prisma.InputJsonObject,
        createdAt: new Date(),
      },
    });

    return item;
  });

  return {
    id: updated.id,
    status: updated.status,
    scheduledSendAt: updated.scheduledSendAt?.toISOString() || null,
  };
}
