import type { JobStatus } from "@/generated/prisma";

export type DashboardJob = {
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
  updatedAt: string;
};

export type JobDashboardData = {
  jobs: DashboardJob[];
  statusCounts: Record<JobStatus, number>;
  newJobsToday: number;
  lastJobsSearchAt: string | null;
};
