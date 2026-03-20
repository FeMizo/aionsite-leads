import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { executeProspectRun, getRunExecutionConfigError } from "@/lib/runs";
import {
  getCronSecret,
} from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = getCronSecret();

  if (!secret) {
    return true;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function executeRun() {
  const result = await executeProspectRun();
  return ok({ result });
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return fail("CRON_UNAUTHORIZED", "Unauthorized cron request.", 401);
  }

  const configError = getRunExecutionConfigError();

  if (configError) {
    return fail("RUN_CONFIG_MISSING", configError, 503);
  }

  try {
    return await executeRun();
  } catch (error) {
    return fail(
      "RUN_EXECUTION_FAILED",
      error instanceof Error
        ? error.message
        : "No se pudo ejecutar la busqueda programada.",
      500
    );
  }
}

export async function POST() {
  const configError = getRunExecutionConfigError();

  if (configError) {
    return fail("RUN_CONFIG_MISSING", configError, 503);
  }

  try {
    return await executeRun();
  } catch (error) {
    return fail(
      "RUN_EXECUTION_FAILED",
      error instanceof Error
        ? error.message
        : "No se pudo ejecutar la busqueda manual.",
      500
    );
  }
}
