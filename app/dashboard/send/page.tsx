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
        description="Selecciona prospectos listos o programados. Si ya tienen fecha futura de envio, se muestran como programados con su horario exacto."
      />

      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />
      <ManualProspectPanel />

      <ProspectTable
        title="Enviar seleccionados"
        description="Los prospectos llegan aqui cuando ya tienen draft. Si tienen una fecha futura, veras estado programado con fecha y hora; el backend solo enviara cuando ya corresponda."
        records={context.data.ready}
        endpoint="/api/send"
        actions={[{ action: "sendSelected", label: "Enviar correos", variant: "primary" }]}
        emptyLabel="No hay prospectos listos o programados para envio."
      />
    </div>
  );
}
