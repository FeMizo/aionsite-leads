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
        description="Administra prospectos approved y ready antes del envio. Solo los ready pasan a la seccion de envios."
      />

      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />

      <ProspectTable
        title="Prospects"
        description="Los approved se quedan aqui hasta que generes draft. Cuando el prospecto tenga prioridad alta y subject/message guardados, sube a ready y aparece tambien en envios."
        records={context.data.prospects}
        endpoint="/api/prospects"
        actions={[
          { action: "generateDrafts", label: "Generar draft", variant: "primary" },
          { action: "rejectRecords", label: "Rechazar", variant: "danger" },
        ]}
        emptyLabel="No hay prospectos approved o ready."
      />
    </div>
  );
}
