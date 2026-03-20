import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { requireBearer } from "@/lib/auth";
import { DATABASE_ENV_KEYS, formatMissingEnvError } from "@/lib/env";
import { transitionProspect } from "@/lib/prospects";

export const runtime = "nodejs";

type ProspectRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: ProspectRouteContext) {
  const authError = requireBearer(request);

  if (authError) {
    return authError;
  }

  const configError = formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS);

  if (configError) {
    return fail("DATABASE_CONFIG_MISSING", configError, 503);
  }

  try {
    const { id } = await context.params;
    const result = await transitionProspect(id, {
      fromStatuses: ["generated", "failed", "rejected"],
      nextStatus: "prospect",
      eventType: "approved_generated",
      note: "Record approved through API",
      clearError: true,
    });

    return ok({ result });
  } catch (error) {
    return fail(
      "PROSPECT_APPROVE_FAILED",
      error instanceof Error ? error.message : "No se pudo aprobar el prospecto.",
      400
    );
  }
}
