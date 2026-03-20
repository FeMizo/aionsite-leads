import type { Prisma, Prospect } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/db";
import { normalizeProspectType } from "@/lib/normalizers";

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

export function isGoodTimeToSend(
  prospect: Pick<SchedulableProspect, "type"> | { type: string },
  referenceDate = new Date()
) {
  const hour = referenceDate.getHours();
  const config = getBusinessHoursConfig(prospect.type);

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
  const scheduledSendAt = new Date(scheduledAtInput);

  if (Number.isNaN(scheduledSendAt.getTime())) {
    throw new Error("La fecha programada no es valida.");
  }

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
