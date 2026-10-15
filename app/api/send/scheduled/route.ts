import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import {
  DATABASE_ENV_KEYS,
  SMTP_ENV_KEYS,
  formatMissingEnvError,
  getCronSecret,
} from "@/lib/env";
import { sendProspectEmails } from "@/lib/mailer";
import { scanMailboxForBounces } from "@/lib/mail-bounces";
import {
  countEmailsSentToday,
  getRandomDailySendTarget,
  scheduleDailyProspectCadence,
} from "@/lib/send-scheduler";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = getCronSecret();

  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function isDatabaseQuotaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /53000|P2039|quota|exceeded the quota/i.test(message);
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
    const now = new Date();
    const target = getRandomDailySendTarget();
    const sentToday = await countEmailsSentToday(now);
    const cadence = await scheduleDailyProspectCadence(now, target, sentToday);
    const result = await sendProspectEmails({
      mode: "all",
      runLimit: target,
      sentToday,
    });
    const bounceScan = await scanMailboxForBounces();

    return ok({ target, cadence, result, bounceScan });
  } catch (error) {
    return fail(
      isDatabaseQuotaError(error) ? "DATABASE_QUOTA_BLOCKED" : "SCHEDULED_SEND_FAILED",
      isDatabaseQuotaError(error)
        ? "El envío se detuvo porque Neon agotó la cuota de Postgres. No se enviaron correos."
        : error instanceof Error ? error.message : "No se pudo ejecutar el envío programado.",
      503
    );
  }
}
