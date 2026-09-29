import type { Metadata } from "next";
import { JobsWorkspace } from "@/components/dashboard/jobs-workspace";
import { jobStatuses } from "@/lib/job-status";
import type { JobStatus } from "@/generated/prisma";
import { getJobDashboardData } from "@/lib/jobs";
import { DashboardUnavailable } from "@/components/dashboard/dashboard-sections";
import { getDashboardPageContext } from "@/components/dashboard/dashboard-sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jobs",
  description: "Vacantes laborales separadas del pipeline comercial de prospectos.",
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const initialStatus = jobStatuses.includes(params.status as JobStatus)
    ? params.status as JobStatus
    : "all";
  const context = await getDashboardPageContext();
  if (context.kind !== "ready") return <DashboardUnavailable context={context} />;

  try {
    return <JobsWorkspace data={await getJobDashboardData()} initialStatus={initialStatus} />;
  } catch (error) {
    return <DashboardUnavailable context={{ kind: "error", setup: context.setup, message: error instanceof Error ? error.message : "No se pudieron cargar los jobs." }} />;
  }
}
