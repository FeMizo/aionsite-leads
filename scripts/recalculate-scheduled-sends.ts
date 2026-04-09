import "dotenv/config";
import type { Prisma } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/db";
import { getProspectTimeZone } from "@/lib/prospect-timezone";
import {
  getNextRecommendedSendAt,
  isScheduledSendAligned,
  MAX_PER_SCHEDULED_SLOT,
  normalizeScheduledSendAt,
} from "@/lib/send-scheduler";

const APPLY_FLAG = "--apply";
const PREVIEW_LIMIT = 20;
const ACTIVE_SCHEDULED_STATUSES = ["ready", "contacted"] as const;

function hasApplyFlag(argv: string[]) {
  return argv.includes(APPLY_FLAG);
}

async function main() {
  const prisma = getPrismaClient();
  const apply = hasApplyFlag(process.argv.slice(2));
  const now = new Date();

  const prospects = await prisma.prospect.findMany({
    where: {
      status: {
        in: [...ACTIVE_SCHEDULED_STATUSES],
      },
      scheduledSendAt: {
        not: null,
      },
    },
    orderBy: [
      {
        scheduledSendAt: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    select: {
      id: true,
      name: true,
      status: true,
      city: true,
      type: true,
      primaryType: true,
      createdAt: true,
      scheduledSendAt: true,
    },
  });

  const assignedCounts = new Map<string, number>();

  const changes = prospects
    .map((prospect) => {
      if (!prospect.scheduledSendAt) {
        return null;
      }

      const timeZone = getProspectTimeZone(prospect.city);
      const primaryType = prospect.primaryType || "";
      const referenceDate =
        prospect.scheduledSendAt.getTime() > now.getTime() ? prospect.scheduledSendAt : now;
      let recalculated =
        prospect.scheduledSendAt.getTime() > now.getTime() &&
        isScheduledSendAligned(prospect.scheduledSendAt, timeZone, primaryType)
          ? prospect.scheduledSendAt
          : normalizeScheduledSendAt(referenceDate, timeZone, primaryType);

      let slotKey = recalculated.toISOString();
      while ((assignedCounts.get(slotKey) || 0) >= MAX_PER_SCHEDULED_SLOT) {
        recalculated = getNextRecommendedSendAt(prospect, recalculated);
        slotKey = recalculated.toISOString();
      }

      assignedCounts.set(slotKey, (assignedCounts.get(slotKey) || 0) + 1);

      if (recalculated.getTime() === prospect.scheduledSendAt.getTime()) {
        return null;
      }

      return {
        id: prospect.id,
        name: prospect.name,
        status: prospect.status,
        from: prospect.scheduledSendAt,
        to: recalculated,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  console.log(
    `[send:reschedule] mode=${apply ? "apply" : "dry-run"} totalScheduled=${prospects.length} changed=${changes.length}`
  );

  if (!changes.length) {
    await prisma.$disconnect();
    return;
  }

  console.log(
    JSON.stringify(
      changes.slice(0, PREVIEW_LIMIT).map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        from: item.from.toISOString(),
        to: item.to.toISOString(),
      })),
      null,
      2
    )
  );

  if (!apply) {
    console.log(`[send:reschedule] Usa ${APPLY_FLAG} para aplicar los cambios.`);
    await prisma.$disconnect();
    return;
  }

  let updated = 0;

  for (const change of changes) {
    await prisma.$transaction([
      prisma.prospect.update({
        where: { id: change.id },
        data: {
          scheduledSendAt: change.to,
          lastCheckedAt: now,
        },
      }),
      prisma.contactEvent.create({
        data: {
          prospectId: change.id,
          eventType: "send_recalculated",
          metadata: {
            note: "Scheduled send recalculated to match the new delivery slots",
            previousScheduledSendAt: change.from.toISOString(),
            scheduledSendAt: change.to.toISOString(),
            reason: "new_delivery_slots",
          } satisfies Prisma.InputJsonObject,
          createdAt: now,
        },
      }),
    ]);

    updated += 1;
  }

  console.log(`[send:reschedule] updated=${updated}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(
    `[send:reschedule] Error: ${error instanceof Error ? error.message : error}`
  );
  process.exitCode = 1;
});
