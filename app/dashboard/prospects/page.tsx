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
        description="Administra solo prospectos approved antes del envio. Los ready ya viven en la seccion de envios."
      />

      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />

      <ProspectTable
        title="Prospects"
        description="Aqui trabajas solo approved. Cuando preparas el mensaje, el prospecto pasa a ready y desaparece de esta vista para entrar en envios."
        records={context.data.prospects}
        endpoint="/api/prospects"
        actions={[
          { action: "generateDrafts", label: "Preparar mensaje", variant: "primary" },
          { action: "rejectRecords", label: "Rechazar", variant: "danger" },
        ]}
        emptyLabel="No hay prospectos approved pendientes."
      />
    </div>
  );
}
