import { NextRequest, NextResponse } from "next/server";
import { sendProspectEmails, sendTestEmail } from "@/lib/mailer";
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
        return NextResponse.json({ error: smtpError }, { status: 503 });
      }

      const result = await sendTestEmail(payload.prospect);
      return NextResponse.json({ ok: true, result });
    }

    const configError =
      formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS) ||
      formatMissingEnvError("SMTP", SMTP_ENV_KEYS);

    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 });
    }

    const ids = Array.isArray(payload.ids) ? payload.ids : [];
    const result = await sendProspectEmails({ prospectIds: ids });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo ejecutar el envio.",
      },
      { status: 500 }
    );
  }
}
