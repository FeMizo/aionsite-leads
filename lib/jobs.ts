import { getPrismaClient } from "@/lib/db";
import { jobStatuses, jobStatusLabels } from "@/lib/job-status";
import type { JobStatus } from "@/generated/prisma";
import type { DashboardJob, JobDashboardData } from "@/lib/job-types";
import { getLocalJobDashboardData, isLocalJobsFallbackAvailable, updateLocalJobStatuses } from "@/lib/local-jobs";

function serializeJob(job: {
  id: string;
  dbId: string;
  company: string;
  title: string;
  salaryLabel: string;
  salaryCurrency: string;
  salaryUsdMin: number | null;
  salaryUsdMax: number | null;
  fitReason: string;
  checkedAt: Date;
  addedAt: Date;
  zone: string;
  region: string;
  source: string;
  link: string;
  stack: unknown;
  status: JobStatus;
  cover: string;
  notes: string;
  lastTouchedAt: Date;
  updatedAt: Date;
}): DashboardJob {
  return {
    ...job,
    stack: Array.isArray(job.stack)
      ? job.stack.filter((item): item is string => typeof item === "string")
      : [],
    checkedAt: job.checkedAt.toISOString(),
    addedAt: job.addedAt.toISOString(),
    lastTouchedAt: job.lastTouchedAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

function getMexicoStartOfDay() {
  const now = new Date();
  const mexicoNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  mexicoNow.setHours(0, 0, 0, 0);
  return mexicoNow;
}

export async function getJobDashboardData(): Promise<JobDashboardData> {
  try {
    const prisma = getPrismaClient();
    const [jobs, settings] = await Promise.all([
      prisma.job.findMany({ orderBy: [{ addedAt: "desc" }, { company: "asc" }] }),
      prisma.jobSettings.findUnique({ where: { id: 1 } }),
    ]);

    const statusCounts = Object.fromEntries(jobStatuses.map((status) => [status, 0])) as Record<JobStatus, number>;
    jobs.forEach((job) => {
      statusCounts[job.status] += 1;
    });

    const startOfDay = getMexicoStartOfDay();
    const newJobsToday = jobs.filter((job) => job.addedAt >= startOfDay).length;

    return {
      jobs: jobs.map(serializeJob),
      statusCounts,
      newJobsToday,
      lastJobsSearchAt: settings?.lastJobsSearchAt.toISOString() ?? null,
    };
  } catch (error) {
    if (!isLocalJobsFallbackAvailable()) throw error;
    return getLocalJobDashboardData();
  }
}

export async function updateJobStatus(id: string, status: JobStatus) {
  return updateJobStatuses([id], status);
}

export async function updateJobStatuses(ids: string[], status: JobStatus) {
  try {
    const prisma = getPrismaClient();
    const result = await prisma.job.updateMany({
      where: { id: { in: ids } },
      data: { status, lastTouchedAt: new Date() },
    });
    return { ...result, dataSource: "postgres" as const };
  } catch (error) {
    if (!isLocalJobsFallbackAvailable()) throw error;
    const result = await updateLocalJobStatuses(ids, status);
    return { ...result, dataSource: "local_backup" as const };
  }
}

export function getJobStatusLabel(status: JobStatus) {
  return jobStatusLabels[status];
}
