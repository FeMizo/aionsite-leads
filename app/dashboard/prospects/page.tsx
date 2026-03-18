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

export default async function ProspectsPage() {
  const context = await getDashboardPageContext();

  if (context.kind !== "ready") {
    return <DashboardUnavailable context={context as DashboardPageContext} />;
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Prospects"
        title="Cola activa"
        description="Administra prospectos activos y reactiva los que quedaron fallidos."
      />

      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />

      <ProspectTable
        title="Prospects"
        description="Cola activa para envio o reactivacion de fallidos."
        records={context.data.prospects}
        endpoint="/api/prospects"
        actions={[
          { action: "restoreFailed", label: "Reactivar fallidos" },
          { action: "archiveRecords", label: "Archivar" },
          { action: "deleteRecords", label: "Eliminar", variant: "danger" },
        ]}
        emptyLabel="No hay prospectos activos."
      />
    </div>
  );
}
