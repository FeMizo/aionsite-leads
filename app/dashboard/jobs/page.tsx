import type { Metadata } from "next";
import { JobsWorkspace } from "@/components/dashboard/jobs-workspace";
import { getJobDashboardData } from "@/lib/jobs";
import { DashboardUnavailable } from "@/components/dashboard/dashboard-sections";
import { getDashboardPageContext } from "@/components/dashboard/dashboard-sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jobs",
  description: "Vacantes laborales separadas del pipeline comercial de prospectos.",
};

export default async function JobsPage() {
  const context = await getDashboardPageContext();
  if (context.kind !== "ready") return <DashboardUnavailable context={context} />;

  try {
    return <JobsWorkspace data={await getJobDashboardData()} />;
  } catch (error) {
    return <DashboardUnavailable context={{ kind: "error", setup: context.setup, message: error instanceof Error ? error.message : "No se pudieron cargar los jobs." }} />;
  }
}
