import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { requireBearer } from "@/lib/auth";
import { DATABASE_ENV_KEYS, formatMissingEnvError } from "@/lib/env";
import { buildProspectOutreachDraft } from "@/lib/outreach";
import { getProspectForMessage, storeProspectDraft } from "@/lib/prospects";

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
    const prospect = await getProspectForMessage(id);
    const draft = buildProspectOutreachDraft(prospect);
    const item = await storeProspectDraft(id, {
      subject: draft.subject,
      message: draft.message,
    });

    return ok({
      ...draft,
      item,
    });
  } catch (error) {
    return fail(
      "PROSPECT_MESSAGE_FAILED",
      error instanceof Error ? error.message : "No se pudo generar el borrador.",
      400
    );
  }
}
