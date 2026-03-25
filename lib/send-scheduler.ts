import type { Prisma, Prospect } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/db";
import {
  addMexicoCityDays,
  createMexicoCityDate,
  getMexicoCityDayBounds,
  getMexicoCityTimeParts,
} from "@/lib/mexico-city-time";
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

type SchedulableProspect = Pick<Prospect, "type" | "scheduledSendAt">;

type PrioritizedProspect = Pick<Prospect, "type" | "createdAt" | "scheduledSendAt"> & {
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

function getReferenceMinutes(referenceDate: Date) {
  const parts = getMexicoCityTimeParts(referenceDate);
  return toMinutes(parts.hour, parts.minute);
}

function isWithinSendWindow(referenceDate: Date) {
  const minutes = getReferenceMinutes(referenceDate);

  return SEND_WINDOWS.some((window) => {
    const start = toMinutes(window.startHour, window.startMinute);
    const end = toMinutes(window.endHour, window.endMinute);

    return minutes >= start && minutes <= end;
  });
}

function isAvoidedSendWindow(referenceDate: Date) {
  const minutes = getReferenceMinutes(referenceDate);

  return minutes >= toMinutes(15, 0) && minutes <= toMinutes(18, 59);
}

function alignToNextDeliverySlot(referenceDate: Date) {
  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const baseDate = addMexicoCityDays(referenceDate, dayOffset, {
      hour: 0,
      minute: 0,
      second: 0,
    });

    for (const slot of SEND_WINDOW_SLOTS) {
      const parts = getMexicoCityTimeParts(baseDate);
      const candidate = createMexicoCityDate({
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: slot.hour,
        minute: slot.minute,
        second: 0,
      });

      if (candidate.getTime() > referenceDate.getTime()) {
        return candidate;
      }
    }
  }

  const fallback = addMexicoCityDays(referenceDate, 1, {
    hour: SEND_WINDOW_SLOTS[0].hour,
    minute: SEND_WINDOW_SLOTS[0].minute,
    second: 0,
  });

  return fallback;
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
  _prospect: Pick<SchedulableProspect, "type"> | { type: string },
  referenceDate = new Date()
) {
  const minutes = getReferenceMinutes(referenceDate);

  if (minutes < toMinutes(8, 0)) {
    return false;
  }

  if (isAvoidedSendWindow(referenceDate)) {
    return false;
  }

  return isWithinSendWindow(referenceDate);
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
  _prospect: Pick<SchedulableProspect, "type"> | { type: string },
  referenceDate = new Date()
) {
  return alignToNextDeliverySlot(referenceDate);
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

  if (Number.isNaN(requestedDate.getTime())) {
    throw new Error("La fecha programada no es valida.");
  }

  const scheduledSendAt = alignToNextDeliverySlot(new Date(requestedDate.getTime() - 1000));

  if (scheduledSendAt.getTime() <= Date.now()) {
    throw new Error("La fecha programada debe estar en el futuro.");
  }

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
  });

  if (!prospect) {
    throw new Error("Prospecto no encontrado.");
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
