import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { requireBearer } from "@/lib/auth";
import { DATABASE_ENV_KEYS, formatMissingEnvError } from "@/lib/env";
import type { OutreachMessageType } from "@/lib/outreach";
import { generateProspectDraft } from "@/lib/prospects";

export const runtime = "nodejs";

type ProspectRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const MESSAGE_TYPES = [
  "first_contact",
  "followup",
  "followup_1",
  "followup_2",
  "followup_3",
  "closing",
] as const satisfies readonly OutreachMessageType[];

function isOutreachMessageType(value: unknown): value is OutreachMessageType {
  return typeof value === "string" && MESSAGE_TYPES.includes(value as OutreachMessageType);
}

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
    let type: OutreachMessageType = "first_contact";

    try {
      const body = (await request.json()) as { type?: unknown };

      if (typeof body?.type !== "undefined") {
        if (!isOutreachMessageType(body.type)) {
          return fail(
            "INVALID_MESSAGE_TYPE",
            "El campo type debe ser first_contact, followup, followup_1, followup_2, followup_3 o closing.",
            400
          );
        }

        type = body.type;
      }
    } catch {
      type = "first_contact";
    }

    const result = await generateProspectDraft(id, type);

    return ok(result);
  } catch (error) {
    return fail(
      "PROSPECT_MESSAGE_FAILED",
      error instanceof Error ? error.message : "No se pudo generar el borrador.",
      400
    );
  }
}
