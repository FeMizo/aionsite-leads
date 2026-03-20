import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { requireBearer } from "@/lib/auth";
import { DATABASE_ENV_KEYS, formatMissingEnvError } from "@/lib/env";
import { getProspectDetail, softDeleteProspect, updateProspect } from "@/lib/prospects";

export const runtime = "nodejs";

type ProspectRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, context: ProspectRouteContext) {
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
    const item = await getProspectDetail(id);

    return ok({ item });
  } catch (error) {
    return fail(
      "PROSPECT_GET_FAILED",
      error instanceof Error ? error.message : "No se pudo obtener el prospecto.",
      404
    );
  }
}

export async function PATCH(request: NextRequest, context: ProspectRouteContext) {
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
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const item = await updateProspect(id, {
      name: typeof payload.name === "string" ? payload.name : undefined,
      contactName: typeof payload.contactName === "string" ? payload.contactName : undefined,
      city: typeof payload.city === "string" ? payload.city : undefined,
      email: typeof payload.email === "string" ? payload.email : undefined,
      phone: typeof payload.phone === "string" ? payload.phone : undefined,
      type: typeof payload.type === "string" ? payload.type : undefined,
      website: typeof payload.website === "string" ? payload.website : undefined,
      rating: typeof payload.rating === "string" ? payload.rating : undefined,
      mapsUrl: typeof payload.mapsUrl === "string" ? payload.mapsUrl : undefined,
      opportunity: typeof payload.opportunity === "string" ? payload.opportunity : undefined,
      recommendedSite:
        typeof payload.recommendedSite === "string" ? payload.recommendedSite : undefined,
      pitchAngle: typeof payload.pitchAngle === "string" ? payload.pitchAngle : undefined,
      subject: typeof payload.subject === "string" ? payload.subject : undefined,
      message: typeof payload.message === "string" ? payload.message : undefined,
      contacted: typeof payload.contacted === "boolean" ? payload.contacted : undefined,
      lastContactedAt:
        typeof payload.lastContactedAt === "string" || payload.lastContactedAt === null
          ? payload.lastContactedAt
          : undefined,
      followupCount:
        typeof payload.followupCount === "number" ? payload.followupCount : undefined,
      businessStatus:
        typeof payload.businessStatus === "string" ? payload.businessStatus : undefined,
      source: typeof payload.source === "string" ? payload.source : undefined,
    });

    return ok({ item });
  } catch (error) {
    return fail(
      "PROSPECT_UPDATE_FAILED",
      error instanceof Error ? error.message : "No se pudo actualizar el prospecto.",
      400
    );
  }
}

export async function DELETE(request: NextRequest, context: ProspectRouteContext) {
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
    const result = await softDeleteProspect(id);

    return ok({ result });
  } catch (error) {
    return fail(
      "PROSPECT_DELETE_FAILED",
      error instanceof Error ? error.message : "No se pudo eliminar el prospecto.",
      400
    );
  }
}
