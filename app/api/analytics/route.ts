import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { requireBearer } from "@/lib/auth";
import { DATABASE_ENV_KEYS, formatMissingEnvError } from "@/lib/env";
import { getPrismaClient } from "@/lib/db";
import { buildCrmAnalytics } from "@/lib/crm-analytics";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authError = requireBearer(request);
  if (authError) return authError;
  const configError = formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS);
  if (configError) return fail("DATABASE_CONFIG_MISSING", configError, 503);

  try {
    const prisma = getPrismaClient();
    const prospects = await prisma.prospect.findMany({
      select: {
        city: true,
        type: true,
        source: true,
        promptVersion: true,
        recommendedOffer: true,
        status: true,
        responseCategory: true,
        revenue: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    return ok({ analytics: buildCrmAnalytics(prospects) });
  } catch (error) {
    return fail("CRM_ANALYTICS_FAILED", error instanceof Error ? error.message : "No se pudo generar la analítica.", 500);
  }
}
