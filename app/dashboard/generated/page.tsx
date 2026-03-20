import { ProspectTable } from "@/components/dashboard/prospect-table";
import {
  DashboardMetricCards,
  DashboardPageContext,
  DashboardSetupPanel,
  DashboardUnavailable,
  getDashboardPageContext,
} from "@/components/dashboard/dashboard-sections";
import { PageHeader } from "@/components/crm/page-header";

export const dynamic = "force-dynamic";

export default async function GeneratedPage() {
  const context = await getDashboardPageContext();

  if (context.kind !== "ready") {
    return <DashboardUnavailable context={context as DashboardPageContext} />;
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Generated"
        title="Prospectos por revisar"
        description="Revisa los registros encontrados por el pipeline, analiza prioridad y decide si se aprueban o rechazan."
      />

      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />

      <ProspectTable
        title="Generated"
        description="Prospectos en generated o analyzed pendientes de aprobacion."
        records={context.data.generated}
        endpoint="/api/prospects"
        actions={[
          { action: "approveGenerated", label: "Aprobar", variant: "primary" },
          { action: "rejectRecords", label: "Rechazar", variant: "danger" },
        ]}
        emptyLabel="No hay registros pendientes de revision."
      />
    </div>
  );
}
