import { NextRequest, NextResponse } from "next/server";
import { sendProspectEmails } from "@/lib/mailer";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
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
