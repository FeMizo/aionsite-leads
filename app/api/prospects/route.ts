import { NextRequest } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { requireBearer } from "@/lib/auth";
import { DATABASE_ENV_KEYS, formatMissingEnvError } from "@/lib/env";
import {
  autoPrepareProspectsForOutreach,
  approveProspect,
  createProspect,
  generateProspectDraft,
  listProspects,
  parseLimit,
  parseProspectStatus,
  transitionProspects,
  type ProspectActionPayload,
} from "@/lib/prospects";

export const runtime = "nodejs";

type CreateProspectPayload = ProspectActionPayload & {
  name?: unknown;
  contactName?: unknown;
  city?: unknown;
  email?: unknown;
  phone?: unknown;
  type?: unknown;
  website?: unknown;
};

export async function GET(request: NextRequest) {
  const authError = requireBearer(request);

  if (authError) {
    return authError;
  }

  const configError = formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS);

  if (configError) {
    return fail("DATABASE_CONFIG_MISSING", configError, 503);
  }

  const statusValue = request.nextUrl.searchParams.get("status");
  const limitValue = request.nextUrl.searchParams.get("limit");
  const limit = parseLimit(limitValue, 20);

  if (limit === null) {
    return fail("INVALID_LIMIT", "El parametro limit debe ser un entero positivo.", 400);
  }

  if (statusValue && !parseProspectStatus(statusValue)) {
    return fail("INVALID_STATUS", "El parametro status no es valido.", 400, {
      allowed: [
        "generated",
        "analyzed",
        "approved",
        "ready",
        "contacted",
        "replied",
        "closed",
        "rejected",
      ],
    });
  }

  try {
    const items = await listProspects({
      status: parseProspectStatus(statusValue),
      limit,
    });

    return ok({
      items,
      count: items.length,
      filters: {
        status: parseProspectStatus(statusValue),
        limit,
      },
    });
  } catch (error) {
    return fail(
      "PROSPECT_LIST_FAILED",
      error instanceof Error ? error.message : "No se pudieron listar los prospectos.",
      500
    );
  }
}

export async function POST(request: NextRequest) {
  const configError = formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS);

  if (configError) {
    return fail("DATABASE_CONFIG_MISSING", configError, 503);
  }

  const payload = (await request.json().catch(() => ({}))) as CreateProspectPayload;

  if (payload.action) {
    return handleLegacyDashboardAction(payload);
  }

  const authError = requireBearer(request);

  if (authError) {
    return authError;
  }

  try {
    const prospect = await createProspect({
      name: typeof payload.name === "string" ? payload.name : undefined,
      contactName: typeof payload.contactName === "string" ? payload.contactName : undefined,
      city: typeof payload.city === "string" ? payload.city : undefined,
      email: typeof payload.email === "string" ? payload.email : undefined,
      phone: typeof payload.phone === "string" ? payload.phone : undefined,
      type: typeof payload.type === "string" ? payload.type : undefined,
      website: typeof payload.website === "string" ? payload.website : undefined,
    });

    return ok(
      {
        item: prospect,
      },
      { status: 201 }
    );
  } catch (error) {
    return fail(
      "PROSPECT_CREATE_FAILED",
      error instanceof Error ? error.message : "No se pudo crear el prospecto.",
      400
    );
  }
}

async function handleLegacyDashboardAction(payload: ProspectActionPayload) {
  const prisma = getPrismaClient();
  const ids = Array.isArray(payload.ids) ? payload.ids : [];

  try {
    switch (payload.action) {
      case "approveGenerated": {
        const approved = await Promise.all(ids.map((id) => approveProspect(id)));
        const autoPrepared = await autoPrepareProspectsForOutreach({
          prospectIds: approved.map((item) => item.id),
        });
        const result = {
          changed: approved.length,
          ids: approved.map((item) => item.id),
          autoPrepared,
        };

        return ok({ result });
      }
      case "generateDrafts": {
        const drafted = await Promise.all(ids.map((id) => generateProspectDraft(id)));
        const result = {
          changed: drafted.length,
          ids: drafted.map((item) => item.item.id),
          statuses: drafted.map((item) => ({
            id: item.item.id,
            status: item.item.status,
          })),
        };

        return ok({ result });
      }
      case "approveAllGenerated": {
        const generatedIds = await prisma.prospect.findMany({
          where: { status: { in: ["generated", "analyzed"] } },
          select: { id: true },
        });
        const approved = await Promise.all(
          generatedIds.map((record) => approveProspect(record.id))
        );
        const autoPrepared = await autoPrepareProspectsForOutreach({
          prospectIds: approved.map((item) => item.id),
        });
        const result = {
          changed: approved.length,
          ids: approved.map((item) => item.id),
          autoPrepared,
        };

        return ok({ result });
      }
      case "rejectRecords": {
        const result = await transitionProspects(ids, {
          fromStatuses: ["generated", "analyzed", "approved", "ready"],
          nextStatus: "rejected",
          eventType: "rejected",
          note: "Record rejected from dashboard",
          clearError: true,
        });

        return ok({ result });
      }
      case "markContacted": {
        const result = await transitionProspects(ids, {
          fromStatuses: ["ready"],
          nextStatus: "contacted",
          eventType: "marked_contacted",
          note: "Record marked as contacted manually from ready state",
          clearError: true,
          data: {
            contacted: true,
            lastContactedAt: new Date(),
            followupStage: 1,
          },
        });

        return ok({ result });
      }
      case "markAsClient": {
        const result = await transitionProspects(ids, {
          fromStatuses: ["contacted", "replied"],
          nextStatus: "closed",
          eventType: "marked_client",
          note: "Record marked as client",
          clearError: true,
        });

        return ok({ result });
      }
      case "createManual": {
        const prospect = await createProspect(payload.prospect || {});

        return ok({
          result: {
            id: prospect.id,
            name: prospect.name,
            status: prospect.status,
          },
        });
      }
      default:
        return fail("UNSUPPORTED_ACTION", "Accion no soportada.", 400);
    }
  } catch (error) {
    return fail(
      "LEGACY_ACTION_FAILED",
      error instanceof Error ? error.message : "No se pudo completar la accion.",
      500
    );
  }
}
