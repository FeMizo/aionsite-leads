import { getPrismaClient } from "@/lib/db";
import { runProspectSearch } from "@/lib/pipeline";
import {
  DATABASE_ENV_KEYS,
  GOOGLE_PLACES_ENV_KEYS,
  formatMissingEnvError,
} from "@/lib/env";

function serializeRun(run: {
  id: string;
  source: string;
  searchesCount: number;
  placesFound: number;
  duplicatesFiltered: number;
  emailsFound: number;
  prospectsSaved: number;
  googlePlacesRequests: number;
  websiteFetches: number;
  status: string;
  error: string | null;
  createdAt: Date;
}) {
  return {
    ...run,
    createdAt: run.createdAt.toISOString(),
  };
}

export function getRunExecutionConfigError() {
  return (
    formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS) ||
    formatMissingEnvError("Google Places", GOOGLE_PLACES_ENV_KEYS)
  );
}

export async function executeProspectRun() {
  return runProspectSearch();
}

export async function listRecentRuns(limit = 20) {
  const prisma = getPrismaClient();
  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.trunc(limit), 1), 100)
    : 20;

  const runs = await prisma.run.findMany({
    orderBy: { createdAt: "desc" },
    take: safeLimit,
  });

  return runs.map(serializeRun);
}
