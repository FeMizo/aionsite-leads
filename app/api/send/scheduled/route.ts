import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import {
  DATABASE_ENV_KEYS,
  SMTP_ENV_KEYS,
  formatMissingEnvError,
  getCronSecret,
} from "@/lib/env";
import { sendProspectEmails } from "@/lib/mailer";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = getCronSecret();

  if (!secret) {
    return true;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return fail("CRON_UNAUTHORIZED", "Unauthorized cron request.", 401);
  }

  const configError =
    formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS) ||
    formatMissingEnvError("SMTP", SMTP_ENV_KEYS);

  if (configError) {
    return fail("SEND_CONFIG_MISSING", configError, 503);
  }

  try {
    const result = await sendProspectEmails({
      mode: "all",
    });

    return ok({ result });
  } catch (error) {
    return fail(
      "SCHEDULED_SEND_FAILED",
      error instanceof Error ? error.message : "No se pudo ejecutar el envio programado.",
      500
    );
  }
}
