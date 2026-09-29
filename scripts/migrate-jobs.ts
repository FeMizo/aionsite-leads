import fs from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient, type JobStatus, Prisma } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "@/lib/env";

loadEnv({ path: path.join(process.cwd(), ".env.local") });

type SourceJob = {
  id: string;
  dbId: string;
  company: string;
  title: string;
  salaryLabel: string;
  salaryCurrency: string;
  salaryUsdMin: number | null;
  salaryUsdMax: number | null;
  fitReason: string;
  checkedAt: string;
  addedAt: string;
  zone: string;
  region: string;
  source: string;
  link: string;
  stack: string[];
  status: JobStatus;
  cover: string;
  notes: string;
  lastTouchedAt: string;
};

type SourceContent = {
  profile: Record<string, unknown>;
  searchCriteria: Record<string, unknown>;
  lastJobsSearchAt: string;
  jobs: SourceJob[];
};

const databaseUrl = getDatabaseUrl();
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

function asDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
  return date;
}

async function main() {
  const sourcePath = path.join(process.cwd(), "..", "AionSite", "src", "data", "jobs", "jobs.json");
  const source = JSON.parse(await fs.readFile(sourcePath, "utf8")) as SourceContent;

  for (const job of source.jobs) {
    await prisma.job.upsert({
      where: { id: job.id },
      create: {
        id: job.id,
        dbId: job.dbId,
        company: job.company,
        title: job.title,
        salaryLabel: job.salaryLabel,
        salaryCurrency: job.salaryCurrency,
        salaryUsdMin: job.salaryUsdMin,
        salaryUsdMax: job.salaryUsdMax,
        fitReason: job.fitReason,
        checkedAt: asDate(job.checkedAt),
        addedAt: asDate(job.addedAt),
        zone: job.zone,
        region: job.region,
        source: job.source,
        link: job.link,
        stack: job.stack as Prisma.InputJsonValue,
        status: job.status,
        cover: job.cover,
        notes: job.notes,
        lastTouchedAt: asDate(job.lastTouchedAt),
      },
      update: {
        dbId: job.dbId,
        company: job.company,
        title: job.title,
        salaryLabel: job.salaryLabel,
        salaryCurrency: job.salaryCurrency,
        salaryUsdMin: job.salaryUsdMin,
        salaryUsdMax: job.salaryUsdMax,
        fitReason: job.fitReason,
        checkedAt: asDate(job.checkedAt),
        addedAt: asDate(job.addedAt),
        zone: job.zone,
        region: job.region,
        source: job.source,
        link: job.link,
        stack: job.stack as Prisma.InputJsonValue,
        cover: job.cover,
        notes: job.notes,
        lastTouchedAt: asDate(job.lastTouchedAt),
      },
    });
  }

  await prisma.jobSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      profile: source.profile as Prisma.InputJsonValue,
      searchCriteria: source.searchCriteria as Prisma.InputJsonValue,
      lastJobsSearchAt: asDate(source.lastJobsSearchAt),
    },
    update: {
      profile: source.profile as Prisma.InputJsonValue,
      searchCriteria: source.searchCriteria as Prisma.InputJsonValue,
      lastJobsSearchAt: asDate(source.lastJobsSearchAt),
    },
  });

  console.log(`Migrated ${source.jobs.length} jobs and job settings from ${sourcePath}`);
}

main().finally(() => prisma.$disconnect());
