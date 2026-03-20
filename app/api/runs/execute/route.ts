import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { requireBearer } from "@/lib/auth";
import { executeProspectRun, getRunExecutionConfigError } from "@/lib/runs";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authError = requireBearer(request);

  if (authError) {
    return authError;
  }

  const configError = getRunExecutionConfigError();

  if (configError) {
    return fail("RUN_CONFIG_MISSING", configError, 503);
  }

  try {
    const result = await executeProspectRun();

    return ok({ result });
  } catch (error) {
    return fail(
      "RUN_EXECUTION_FAILED",
      error instanceof Error ? error.message : "No se pudo ejecutar la busqueda manual.",
      500
    );
  }
}
