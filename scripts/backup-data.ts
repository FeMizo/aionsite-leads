import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "@/lib/env";

loadEnv({ path: path.join(process.cwd(), ".env.local") });

const backupRoot = process.env.AIONSITE_BACKUP_DIR?.trim()
  || path.resolve(process.cwd(), "..", "aionsite-leads-backups");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.join(backupRoot, timestamp);
const localJobsPath = process.env.AIONSITE_JOBS_PATH?.trim()
  || path.resolve(process.cwd(), "..", "AionSite", "src", "data", "jobs", "jobs.json");

async function writeJson(filename: string, value: unknown) {
  await fs.writeFile(
    path.join(outputDir, filename),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8"
  );
}

async function copyLocalJobs() {
  const destination = path.join(outputDir, "local-jobs.json");
  const raw = await fs.readFile(localJobsPath);
  await fs.writeFile(destination, raw);

  return {
    status: "complete" as const,
    sourcePath: localJobsPath,
    destination,
    bytes: raw.byteLength,
    sha256: createHash("sha256").update(raw).digest("hex"),
  };
}

async function backupDatabase() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    return { status: "skipped" as const, reason: "DATABASE_URL no está configurada." };
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const [jobs, jobSettings, prospects, contactEvents, runs] = await Promise.all([
      prisma.job.findMany({ orderBy: { addedAt: "asc" } }),
      prisma.jobSettings.findUnique({ where: { id: 1 } }),
      prisma.prospect.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.contactEvent.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.run.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    await writeJson("database-jobs.json", jobs);
    await writeJson("database-job-settings.json", jobSettings);
    await writeJson("database-prospects.json", prospects);
    await writeJson("database-contact-events.json", contactEvents);
    await writeJson("database-runs.json", runs);

    return {
      status: "complete" as const,
      counts: {
        jobs: jobs.length,
        prospects: prospects.length,
        contactEvents: contactEvents.length,
        runs: runs.length,
      },
      omitted: [
        "ProspectCrawl.pdfData",
        "ProspectCrawl records",
        "ProspectResearch records",
      ],
    };
  } catch (error) {
    return {
      status: "failed" as const,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  let localJobs;
  try {
    localJobs = await copyLocalJobs();
  } catch (error) {
    localJobs = {
      status: "failed" as const,
      sourcePath: localJobsPath,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const database = await backupDatabase();
  await writeJson("manifest.json", {
    createdAt: new Date().toISOString(),
    outputDir,
    localJobs,
    database,
    recoveryNotes: [
      "El respaldo local de Jobs puede usarse sin Neon para lectura y cambios locales.",
      "El respaldo de Prospectos requiere que el intento de base de datos termine correctamente.",
      "Los PDFs y resultados de investigación no se incluyen en este respaldo operativo.",
    ],
  });

  console.log(JSON.stringify({ outputDir, localJobs, database }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
