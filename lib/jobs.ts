import { getPrismaClient } from "@/lib/db";
import { jobStatuses, jobStatusLabels } from "@/lib/job-status";
import type { JobStatus } from "@/generated/prisma";
import type { DashboardJob, JobDashboardData } from "@/lib/job-types";

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
}

export async function updateJobStatus(id: string, status: JobStatus) {
  const prisma = getPrismaClient();
  return prisma.job.update({
    where: { id },
    data: { status, lastTouchedAt: new Date() },
  });
}

export async function updateJobStatuses(ids: string[], status: JobStatus) {
  const prisma = getPrismaClient();
  return prisma.job.updateMany({
    where: { id: { in: ids } },
    data: { status, lastTouchedAt: new Date() },
  });
}

export function getJobStatusLabel(status: JobStatus) {
  return jobStatusLabels[status];
}
