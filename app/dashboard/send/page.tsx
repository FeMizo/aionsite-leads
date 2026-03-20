import { ProspectTable } from "@/components/dashboard/prospect-table";
import { ManualProspectPanel } from "@/components/dashboard/manual-prospect-panel";
import {
  DashboardMetricCards,
  DashboardPageContext,
  DashboardSetupPanel,
  DashboardUnavailable,
  getDashboardPageContext,
} from "@/components/dashboard/dashboard-sections";
import { PageHeader } from "@/components/crm/page-header";

export const dynamic = "force-dynamic";

export default async function SendPage() {
  const context = await getDashboardPageContext();

  if (context.kind !== "ready") {
    return <DashboardUnavailable context={context as DashboardPageContext} />;
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Envios"
        title="Envio de correos"
        description="Selecciona solo prospectos ready y dispara el flujo SMTP desde aqui."
      />

      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />
      <ManualProspectPanel />

      <ProspectTable
        title="Enviar seleccionados"
        description="Selecciona prospectos ready con draft guardado y prioridad alta para disparar SMTP."
        records={context.data.prospects.filter((record) => record.status === "ready")}
        endpoint="/api/send"
        actions={[{ action: "sendSelected", label: "Enviar correos", variant: "primary" }]}
        emptyLabel="No hay prospectos ready para envio."
      />
    </div>
  );
}
