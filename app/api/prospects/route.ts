import { NextRequest, NextResponse } from "next/server";
import type { Prisma, ProspectStatus } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/db";
import { getDashboardData } from "@/lib/dashboard";
import { DATABASE_ENV_KEYS, formatMissingEnvError } from "@/lib/env";

export const runtime = "nodejs";

type ActionPayload = {
  action?: string;
  ids?: string[];
};

type TransitionConfig = {
  fromStatuses?: ProspectStatus[];
  nextStatus: ProspectStatus;
  eventType: string;
  note: string;
  clearError?: boolean;
};

async function transitionProspects(ids: string[], config: TransitionConfig) {
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
    };
  });
}

export async function GET() {
  const configError = formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS);

  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  const data = await getDashboardData();
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  const configError = formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS);

  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  const prisma = getPrismaClient();
  const payload = (await request.json().catch(() => ({}))) as ActionPayload;
  const ids = Array.isArray(payload.ids) ? payload.ids : [];

  try {
    switch (payload.action) {
      case "approveGenerated": {
        const result = await transitionProspects(ids, {
          fromStatuses: ["generated"],
          nextStatus: "prospect",
          eventType: "approved_generated",
          note: "Record moved from generated to prospect",
          clearError: true,
        });
        return NextResponse.json({ ok: true, result });
      }
      case "approveAllGenerated": {
        const generatedIds = await prisma.prospect.findMany({
          where: { status: "generated" },
          select: { id: true },
        });

        const result = await transitionProspects(
          generatedIds.map((record) => record.id),
          {
            fromStatuses: ["generated"],
            nextStatus: "prospect",
            eventType: "approved_generated",
            note: "All generated records moved to prospect",
            clearError: true,
          }
        );
        return NextResponse.json({ ok: true, result });
      }
      case "restoreFailed": {
        const result = await transitionProspects(ids, {
          fromStatuses: ["failed"],
          nextStatus: "prospect",
          eventType: "restored_failed",
          note: "Failed prospect restored to active queue",
          clearError: true,
        });
        return NextResponse.json({ ok: true, result });
      }
      case "archiveRecords": {
        const result = await transitionProspects(ids, {
          nextStatus: "archived",
          eventType: "archived",
          note: "Record archived from dashboard",
        });
        return NextResponse.json({ ok: true, result });
      }
      case "deleteRecords": {
        const result = await transitionProspects(ids, {
          nextStatus: "deleted",
          eventType: "deleted",
          note: "Record deleted from active flow",
        });
        return NextResponse.json({ ok: true, result });
      }
      case "markContacted": {
        const result = await transitionProspects(ids, {
          fromStatuses: ["prospect", "failed"],
          nextStatus: "contacted",
          eventType: "marked_contacted",
          note: "Record marked as contacted manually",
          clearError: true,
        });
        return NextResponse.json({ ok: true, result });
      }
      case "markAsClient": {
        const result = await transitionProspects(ids, {
          fromStatuses: ["contacted", "replied"],
          nextStatus: "closed",
          eventType: "marked_client",
          note: "Record marked as client",
          clearError: true,
        });
        return NextResponse.json({ ok: true, result });
      }
      default:
        return NextResponse.json({ error: "Accion no soportada." }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo completar la accion.",
      },
      { status: 500 }
    );
  }
}
