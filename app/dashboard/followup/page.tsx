import type { Metadata } from "next";
import { ProspectTable } from "@/components/dashboard/prospect-table";
import {
  DashboardMetricCards,
  DashboardPageContext,
  DashboardSetupPanel,
  DashboardUnavailable,
  getDashboardPageContext,
} from "@/components/dashboard/dashboard-sections";
import { getProspectsByStatuses } from "@/lib/dashboard";
import { PageHeader } from "@/components/crm/page-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seguimiento",
  description: "Prospectos que requieren seguimiento comercial.",
};

export default async function FollowupPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const context = await getDashboardPageContext();

  if (context.kind !== "ready") {
    return <DashboardUnavailable context={context as DashboardPageContext} />;
  }

  const { items, totalCount } = await getProspectsByStatuses({
    statuses: ["followup"],
    orderBy: "lastContactedAt",
  });

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Seguimiento"
        title="Prospectos en seguimiento"
        description="Consulta únicamente los registros que requieren una nueva acción comercial."
      />
      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />
      <ProspectTable
        title="Seguimiento"
        description="Registros con seguimiento pendiente."
        records={items}
        endpoint="/api/prospects"
        actions={[]}
        emptyLabel="No hay prospectos en seguimiento."
        page={page}
        pageSize={25}
        totalCount={totalCount}
      />
    </div>
  );
}
