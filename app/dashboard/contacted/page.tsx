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

export default async function ContactedPage() {
  const context = await getDashboardPageContext();

  if (context.kind !== "ready") {
    return <DashboardUnavailable context={context as DashboardPageContext} />;
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Contactados"
        title="Seguimiento comercial"
        description="Consulta los registros ya contactados, respondidos o cerrados desde una sola vista."
      />

      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />

      <ProspectTable
        title="Contactados"
        description="Ultimos registros ya contactados o cerrados."
        records={context.data.contacted}
        endpoint="/api/prospects"
        actions={[{ action: "markAsClient", label: "Marcar cliente", variant: "primary" }]}
        emptyLabel="Todavia no hay contactados."
      />
    </div>
  );
}
