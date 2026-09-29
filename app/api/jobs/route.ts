import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { getJobDashboardData, updateJobStatus } from "@/lib/jobs";
import { jobStatuses } from "@/lib/job-status";
import { DATABASE_ENV_KEYS, formatMissingEnvError } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  const configError = formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS);
  if (configError) return fail("DATABASE_CONFIG_MISSING", configError, 503);

  try {
    return ok({ data: await getJobDashboardData() });
  } catch (error) {
    return fail("JOBS_GET_FAILED", error instanceof Error ? error.message : "No se pudieron cargar los jobs.", 500);
  }
}

export async function POST(request: NextRequest) {
  const configError = formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS);
  if (configError) return fail("DATABASE_CONFIG_MISSING", configError, 503);

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (payload.action !== "changeStatus") {
    return fail("INVALID_ACTION", "La acción de jobs no es válida.", 400);
  }

  const id = typeof payload.id === "string" ? payload.id : "";
  const status = typeof payload.status === "string" ? payload.status : "";
  if (!id || !(jobStatuses as readonly string[]).includes(status)) {
    return fail("INVALID_JOB_STATUS", "El job o estado no es válido.", 400);
  }

  try {
    const job = await updateJobStatus(id, status as (typeof jobStatuses)[number]);
    return ok({ item: job });
  } catch (error) {
    return fail("JOB_STATUS_UPDATE_FAILED", error instanceof Error ? error.message : "No se pudo actualizar el estado.", 400);
  }
}
