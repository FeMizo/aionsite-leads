import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getJobDashboardData, updateJobStatuses } from "@/lib/jobs";
import { jobStatuses } from "@/lib/job-status";
import { DATABASE_ENV_KEYS, formatMissingEnvError } from "@/lib/env";
import { getLocalJobDashboardData, isLocalJobsFallbackAvailable } from "@/lib/local-jobs";

export const runtime = "nodejs";

export async function GET() {
  const configError = formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS);
  if (configError && isLocalJobsFallbackAvailable()) {
    try {
      return ok({ data: await getLocalJobDashboardData(), dataSource: "local_backup" });
    } catch (error) {
      return fail("LOCAL_JOBS_FALLBACK_FAILED", error instanceof Error ? error.message : "No se pudo leer el respaldo local.", 503);
    }
  }
  if (configError) return fail("DATABASE_CONFIG_MISSING", configError, 503);

  try {
    return ok({ data: await getJobDashboardData(), dataSource: "postgres" });
  } catch (error) {
    if (isLocalJobsFallbackAvailable()) {
      try {
        return ok({ data: await getLocalJobDashboardData(), dataSource: "local_backup" });
      } catch {
        // Preserve the original database error when no usable local snapshot exists.
      }
    }
    return fail("JOBS_GET_FAILED", error instanceof Error ? error.message : "No se pudieron cargar los jobs.", 500);
  }
}

export async function POST(request: NextRequest) {
  const configError = formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS);
  if (configError && !isLocalJobsFallbackAvailable()) return fail("DATABASE_CONFIG_MISSING", configError, 503);

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (payload.action !== "changeStatus") {
    return fail("INVALID_ACTION", "La acción de jobs no es válida.", 400);
  }

  const ids = Array.isArray(payload.ids)
    ? payload.ids.filter((value): value is string => typeof value === "string" && value.length > 0)
    : typeof payload.id === "string"
      ? [payload.id]
      : [];
  const status = typeof payload.status === "string" ? payload.status : "";
  if (!ids.length || !(jobStatuses as readonly string[]).includes(status)) {
    return fail("INVALID_JOB_STATUS", "El job o estado no es válido.", 400);
  }

  try {
    const result = await updateJobStatuses([...new Set(ids)], status as (typeof jobStatuses)[number]);
    return ok({ updated: result.count, dataSource: result.dataSource });
  } catch (error) {
    return fail("JOB_STATUS_UPDATE_FAILED", error instanceof Error ? error.message : "No se pudo actualizar el estado.", 503);
  }
}
