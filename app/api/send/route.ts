import { NextRequest, NextResponse } from "next/server";
import { sendProspectEmails } from "@/lib/mailer";
import { formatMissingEnvError } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const configError =
    formatMissingEnvError("la base de datos", ["DATABASE_URL"]) ||
    formatMissingEnvError("SMTP", ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"]);

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
