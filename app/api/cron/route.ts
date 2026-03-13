import { NextRequest, NextResponse } from "next/server";
import { runProspectSearch } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return true;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function executeRun() {
  const result = await runProspectSearch();
  return NextResponse.json({ ok: true, result });
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  try {
    return await executeRun();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo ejecutar la corrida programada.",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    return await executeRun();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo ejecutar la corrida manual.",
      },
      { status: 500 }
    );
  }
}
