import { NextRequest, NextResponse } from "next/server";
import { runProspectSearch } from "@/lib/pipeline";
import { formatMissingEnvError } from "@/lib/env";

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

  const configError =
    formatMissingEnvError("la base de datos", ["DATABASE_URL"]) ||
    formatMissingEnvError("Google Places", ["GOOGLE_MAPS_API_KEY"]);

  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
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
  const configError =
    formatMissingEnvError("la base de datos", ["DATABASE_URL"]) ||
    formatMissingEnvError("Google Places", ["GOOGLE_MAPS_API_KEY"]);

  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

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
