import {
  DashboardOverview,
  DashboardUnavailable,
  getDashboardPageContext,
} from "@/components/dashboard/dashboard-sections";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await getDashboardPageContext();

  if (context.kind !== "ready") {
    return <DashboardUnavailable context={context} />;
  }

  return <DashboardOverview data={context.data} setup={context.setup} />;
}
