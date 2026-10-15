import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { JobStatus } from "@/generated/prisma";
import { jobStatuses } from "@/lib/job-status";
import type { DashboardJob, JobDashboardData } from "@/lib/job-types";

type LocalJob = Omit<DashboardJob, "updatedAt"> & {
  updatedAt?: string;
};

type LocalJobsFile = {
  profile?: Record<string, unknown>;
  searchCriteria?: Record<string, unknown>;
  lastJobsSearchAt?: string;
  jobs: LocalJob[];
};

function getDefaultJobsPath() {
  return path.resolve(process.cwd(), "..", "AionSite", "src", "data", "jobs", "jobs.json");
}

export function getLocalJobsPath() {
  return process.env.AIONSITE_JOBS_PATH?.trim() || getDefaultJobsPath();
}

export function isLocalJobsFallbackAvailable() {
  return Boolean(process.env.AIONSITE_JOBS_PATH?.trim()) || process.env.VERCEL !== "1";
}

function getLocalJobsWritePath() {
  return process.env.AIONSITE_JOBS_WRITE_PATH?.trim() || getLocalJobsPath();
}

function canWriteLocalJobs() {
  return process.env.VERCEL !== "1" && process.env.AIONSITE_JOBS_WRITE_ENABLED === "true";
}

function normalizeJob(job: LocalJob): DashboardJob {
  const lastTouchedAt = job.lastTouchedAt || job.updatedAt || job.checkedAt;

  return {
    ...job,
    stack: Array.isArray(job.stack)
      ? job.stack.filter((item): item is string => typeof item === "string")
      : [],
    lastTouchedAt,
    updatedAt: job.updatedAt || lastTouchedAt,
  };
}

async function readLocalJobsFile() {
  const sourcePath = getLocalJobsPath();
  const raw = await fs.readFile(sourcePath, "utf8");
  const parsed = JSON.parse(raw) as LocalJobsFile;

  if (!parsed || !Array.isArray(parsed.jobs)) {
    throw new Error(`El respaldo local de Jobs no tiene un formato válido: ${sourcePath}`);
  }

  return { sourcePath, content: parsed };
}

function getMexicoStartOfDay() {
  const now = new Date();
  const mexicoNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  mexicoNow.setHours(0, 0, 0, 0);
  return mexicoNow;
}

export async function getLocalJobDashboardData(): Promise<JobDashboardData> {
  const { content } = await readLocalJobsFile();
  const jobs = content.jobs.map(normalizeJob).sort((left, right) => {
    return new Date(right.addedAt).getTime() - new Date(left.addedAt).getTime();
  });
  const statusCounts = Object.fromEntries(jobStatuses.map((status) => [status, 0])) as Record<JobStatus, number>;

  for (const job of jobs) {
    if (job.status in statusCounts) {
      statusCounts[job.status] += 1;
    }
  }

  const startOfDay = getMexicoStartOfDay().getTime();

  return {
    jobs,
    statusCounts,
    newJobsToday: jobs.filter((job) => new Date(job.addedAt).getTime() >= startOfDay).length,
    lastJobsSearchAt: content.lastJobsSearchAt || null,
  };
}

async function createLocalBackup(sourcePath: string, raw: string) {
  const backupDir = process.env.AIONSITE_BACKUP_DIR?.trim() || path.resolve(process.cwd(), "..", "aionsite-leads-backups");
  await fs.mkdir(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `jobs-before-status-${timestamp}.json`);
  await fs.writeFile(backupPath, raw, "utf8");
  return { backupPath, sourcePath };
}

export async function updateLocalJobStatuses(ids: string[], status: JobStatus) {
  if (!canWriteLocalJobs()) {
    throw new Error("LOCAL_FALLBACK_READ_ONLY: habilita AIONSITE_JOBS_WRITE_ENABLED solo en entorno local.");
  }

  const { sourcePath, content } = await readLocalJobsFile();
  const uniqueIds = new Set(ids);
  const now = new Date().toISOString();
  let updated = 0;

  for (const job of content.jobs) {
    if (!uniqueIds.has(job.id)) continue;
    job.status = status;
    job.lastTouchedAt = now;
    job.updatedAt = now;
    updated += 1;
  }

  if (!updated) return { count: 0, backupPath: null, sourcePath };

  const original = await fs.readFile(sourcePath, "utf8");
  const backup = await createLocalBackup(sourcePath, original);
  const writePath = getLocalJobsWritePath();
  const tempPath = `${writePath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  await fs.rename(tempPath, writePath);

  return { count: updated, backupPath: backup.backupPath, sourcePath: writePath };
}

export async function getLocalJobsFingerprint() {
  const { sourcePath } = await readLocalJobsFile();
  const raw = await fs.readFile(sourcePath);
  return {
    sourcePath,
    sha256: createHash("sha256").update(raw).digest("hex"),
    bytes: raw.byteLength,
  };
}
