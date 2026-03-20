import { NextRequest, NextResponse } from "next/server";
import { runProspectSearch } from "@/lib/pipeline";
import {
  DATABASE_ENV_KEYS,
  GOOGLE_PLACES_ENV_KEYS,
  formatMissingEnvError,
  getCronSecret,
} from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = getCronSecret();

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
    formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS) ||
    formatMissingEnvError("Google Places", GOOGLE_PLACES_ENV_KEYS);

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
            : "No se pudo ejecutar la busqueda programada.",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  const configError =
    formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS) ||
    formatMissingEnvError("Google Places", GOOGLE_PLACES_ENV_KEYS);

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
            : "No se pudo ejecutar la busqueda manual.",
      },
      { status: 500 }
    );
  }
}
