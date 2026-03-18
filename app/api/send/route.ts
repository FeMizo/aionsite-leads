import { NextRequest, NextResponse } from "next/server";
import { sendProspectEmails } from "@/lib/mailer";
import { DATABASE_ENV_KEYS, SMTP_ENV_KEYS, formatMissingEnvError } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const configError =
    formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS) ||
    formatMissingEnvError("SMTP", SMTP_ENV_KEYS);

  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as {
      ids?: string[];
    };
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
