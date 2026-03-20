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
        title="Prospectos generados"
        description="Revisa los registros encontrados por el pipeline antes de moverlos a la cola activa."
      />

      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />

      <ProspectTable
        title="Generated"
        description="Prospectos detectados por la ultima busqueda, pendientes de aprobar."
        records={context.data.generated}
        endpoint="/api/prospects"
        actions={[
          { action: "approveGenerated", label: "Aprobar", variant: "primary" },
          { action: "archiveRecords", label: "Archivar" },
          { action: "deleteRecords", label: "Eliminar", variant: "danger" },
        ]}
        emptyLabel="No hay registros generated."
      />
    </div>
  );
}
