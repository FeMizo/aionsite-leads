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
  title: "Generados",
  description: "Prospectos nuevos capturados por el pipeline pendientes de revision, aprobacion o rechazo.",
};

const PAGE_SIZE = 25;

export default async function GeneratedPage({
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
    statuses: ["generated", "analyzed"],
  });

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Generados"
        title="Prospectos por revisar"
        description="Revisa los registros encontrados por el pipeline, analiza prioridad y decide si se aprueban o rechazan."
      />

      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />

      <ProspectTable
        title="Generados"
        description="Prospectos generados o analizados pendientes de aprobación."
        records={items}
        endpoint="/api/prospects"
        actions={[
          { action: "approveGenerated", label: "Aprobar", variant: "primary" },
          { action: "rejectRecords", label: "Rechazar", variant: "danger" },
        ]}
        emptyLabel="No hay registros pendientes de revision."
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
      />
    </div>
  );
}
