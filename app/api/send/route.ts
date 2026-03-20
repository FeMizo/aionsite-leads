import { NextRequest } from "next/server";
import { sendProspectEmails, sendTestEmail } from "@/lib/mailer";
import { ok, fail } from "@/lib/api";
import {
  DATABASE_ENV_KEYS,
  SMTP_ENV_KEYS,
  formatMissingEnvError,
} from "@/lib/env";
import type { ManualProspectInput } from "@/lib/manual-prospects";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      ids?: string[];
      mode?: string;
      prospect?: ManualProspectInput;
    };

    if (payload.mode === "test") {
      const smtpError = formatMissingEnvError("SMTP", SMTP_ENV_KEYS);

      if (smtpError) {
        return fail("SMTP_CONFIG_MISSING", smtpError, 503);
      }

      const result = await sendTestEmail(payload.prospect);
      return ok({ result });
    }

    const configError =
      formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS) ||
      formatMissingEnvError("SMTP", SMTP_ENV_KEYS);

    if (configError) {
      return fail("SEND_CONFIG_MISSING", configError, 503);
    }

    const ids = Array.isArray(payload.ids) ? payload.ids : [];
    const mode =
      payload.mode === "initial" || payload.mode === "followups" || payload.mode === "all"
        ? payload.mode
        : "all";
    const result = await sendProspectEmails({ prospectIds: ids, mode });

    return ok({ result });
  } catch (error) {
    return fail(
      "SEND_FAILED",
      error instanceof Error ? error.message : "No se pudo ejecutar el envio.",
      500
    );
  }
}
