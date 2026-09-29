import type { Metadata } from "next";
import {
  DashboardOverview,
  DashboardUnavailable,
  getDashboardPageContext,
} from "@/components/dashboard/dashboard-sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Vista general del pipeline: prospectos generados, aprobados, listos y contactados.",
};

export default async function DashboardPage() {
  const context = await getDashboardPageContext();

  if (context.kind !== "ready") {
    return <DashboardUnavailable context={context} />;
  }

  return <DashboardOverview data={context.data} setup={context.setup} />;
}
