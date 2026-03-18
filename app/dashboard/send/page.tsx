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
        description="Selecciona prospectos activos listos para contacto y dispara el flujo SMTP desde aqui."
      />

      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />

      <ProspectTable
        title="Enviar seleccionados"
        description="Selecciona prospectos activos para disparar SMTP desde la plataforma."
        records={context.data.prospects.filter((record) => record.status === "prospect")}
        endpoint="/api/send"
        actions={[{ action: "sendSelected", label: "Enviar correos", variant: "primary" }]}
        emptyLabel="No hay prospectos listos para envio."
      />
    </div>
  );
}
