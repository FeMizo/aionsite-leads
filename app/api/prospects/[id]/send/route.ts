import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { requireBearer } from "@/lib/auth";
import {
  DATABASE_ENV_KEYS,
  SMTP_ENV_KEYS,
  formatMissingEnvError,
} from "@/lib/env";
import { sendProspectEmailById } from "@/lib/mailer";

export const runtime = "nodejs";
export const maxDuration = 300;

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

  const configError =
    formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS) ||
    formatMissingEnvError("SMTP", SMTP_ENV_KEYS);

  if (configError) {
    return fail("SEND_CONFIG_MISSING", configError, 503);
  }

  const payload = (await request.json().catch(() => ({}))) as {
    subject?: unknown;
    message?: unknown;
  };

  if (typeof payload.subject !== "string" || !payload.subject.trim()) {
    return fail("INVALID_SUBJECT", "El campo subject es obligatorio.", 400);
  }

  if (typeof payload.message !== "string" || !payload.message.trim()) {
    return fail("INVALID_MESSAGE", "El campo message es obligatorio.", 400);
  }

  try {
    const { id } = await context.params;
    const result = await sendProspectEmailById({
      prospectId: id,
      subject: payload.subject,
      message: payload.message,
    });

    return ok({ result });
  } catch (error) {
    return fail(
      "PROSPECT_SEND_FAILED",
      error instanceof Error ? error.message : "No se pudo enviar el correo.",
      400
    );
  }
}
