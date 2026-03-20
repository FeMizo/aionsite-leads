import type { Prisma, Prospect } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/db";
import { normalizeProspectType } from "@/lib/normalizers";
import { getProspectScoreCard, type ProspectPriority } from "@/lib/prospect-scoring";

export const BUSINESS_HOURS = {
  restaurant: {
    bestHours: [10, 11, 12],
    avoidHours: [13, 14, 15, 19, 20, 21],
  },
  hotel: {
    bestHours: [9, 10, 11, 16, 17],
    avoidHours: [22, 23, 0, 1, 2, 3, 4, 5],
  },
  default: {
    bestHours: [9, 10, 11, 16, 17],
    avoidHours: [22, 23, 0, 1, 2, 3, 4, 5],
  },
} as const;

export const MAX_PER_RUN = 3;
export const MAX_PER_DAY = 15;

type BusinessHoursConfig = {
  bestHours: readonly number[];
  avoidHours: readonly number[];
};

type SchedulableProspect = Pick<Prospect, "type" | "scheduledSendAt">;

type PrioritizedProspect = Pick<Prospect, "type" | "createdAt" | "scheduledSendAt"> & {
  score?: number;
  priority?: ProspectPriority;
  website?: string;
  email?: string;
  phone?: string;
  mapsUrl?: string;
};

function getBusinessHoursConfig(type: string): BusinessHoursConfig {
  const normalizedType = normalizeProspectType(type || "");

  if (normalizedType === "restaurant") {
    return BUSINESS_HOURS.restaurant;
  }

  if (normalizedType === "hotel") {
    return BUSINESS_HOURS.hotel;
  }

  return BUSINESS_HOURS.default;
}

export function getHumanTime(hour: number) {
  const minutes = Math.floor(Math.random() * 41) + 10;

  return {
    hour,
    minutes,
  };
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

export function humanizeScheduledDate(referenceDate: Date) {
  const humanTime = getHumanTime(referenceDate.getHours());
  const nextDate = new Date(referenceDate);
  nextDate.setHours(humanTime.hour, humanTime.minutes, 0, 0);

  return nextDate;
}

export function isGoodTimeToSend(
  prospect: Pick<SchedulableProspect, "type"> | { type: string },
  referenceDate = new Date()
) {
  const day = referenceDate.getDay();
  const hour = referenceDate.getHours();
  const config = getBusinessHoursConfig(prospect.type);

  if (day === 0) {
    return false;
  }

  if (day === 1 && hour < 10) {
    return false;
  }

  if (config.avoidHours.includes(hour)) {
    return false;
  }

  return config.bestHours.includes(hour);
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

export async function countEmailsSentToday(referenceDate = new Date()) {
  const prisma = getPrismaClient();
  const startOfDay = new Date(referenceDate);
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.contactEvent.count({
    where: {
      eventType: {
        in: ["send_success", "followup_1_sent", "followup_2_sent", "followup_3_sent"],
      },
      createdAt: {
        gte: startOfDay,
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

  const scheduledSendAt = humanizeScheduledDate(requestedDate);

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
    throw new Error("La fecha programada cae fuera del horario recomendado para este tipo de negocio.");
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
