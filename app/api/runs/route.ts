import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { requireBearer } from "@/lib/auth";
import { DATABASE_ENV_KEYS, formatMissingEnvError } from "@/lib/env";
import { listRecentRuns } from "@/lib/runs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authError = requireBearer(request);

  if (authError) {
    return authError;
  }

  const configError = formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS);

  if (configError) {
    return fail("DATABASE_CONFIG_MISSING", configError, 503);
  }

  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 20;

  if (!Number.isFinite(limit) || limit <= 0) {
    return fail("INVALID_LIMIT", "El parametro limit debe ser un entero positivo.", 400);
  }

  try {
    const items = await listRecentRuns(limit);

    return ok({
      items,
      count: items.length,
    });
  } catch (error) {
    return fail(
      "RUN_LIST_FAILED",
      error instanceof Error ? error.message : "No se pudieron listar las busquedas.",
      500
    );
  }
}
