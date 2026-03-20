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
        description="Selecciona prospectos ready con draft guardado. El envio real sigue validando prioridad alta y reglas SMTP."
      />

      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />
      <ManualProspectPanel />

      <ProspectTable
        title="Enviar seleccionados"
        description="Los prospectos llegan aqui cuando ya tienen draft. Al enviar, el backend valida prioridad alta, email y estado listo."
        records={context.data.ready}
        endpoint="/api/send"
        actions={[{ action: "sendSelected", label: "Enviar correos", variant: "primary" }]}
        emptyLabel="No hay prospectos ready para envio."
      />
    </div>
  );
}
