import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { requireBearer } from "@/lib/auth";
import { DATABASE_ENV_KEYS, formatMissingEnvError } from "@/lib/env";
import { rejectProspect } from "@/lib/prospects";

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
    const result = await rejectProspect(id);

    return ok({ result });
  } catch (error) {
    return fail(
      "PROSPECT_REJECT_FAILED",
      error instanceof Error ? error.message : "No se pudo rechazar el prospecto.",
      400
    );
  }
}
