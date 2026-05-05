import type { Metadata } from "next";
import { ProspectTable } from "@/components/dashboard/prospect-table";
import { ManualProspectPanel } from "@/components/dashboard/manual-prospect-panel";
import {
  DashboardMetricCards,
  DashboardPageContext,
  DashboardSetupPanel,
  DashboardUnavailable,
  getDashboardPageContext,
} from "@/components/dashboard/dashboard-sections";
import { getPaginatedProspects } from "@/lib/dashboard";
import { PageHeader } from "@/components/crm/page-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Envios",
  description: "Prospectos con draft listo para enviar o programados con fecha y hora especifica.",
};

const PAGE_SIZE = 25;

export default async function SendPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const context = await getDashboardPageContext();

  if (context.kind !== "ready") {
    return <DashboardUnavailable context={context as DashboardPageContext} />;
  }

  const { items, totalCount } = await getPaginatedProspects({
    statuses: ["ready"],
    page,
    pageSize: PAGE_SIZE,
  });

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
        records={items}
        endpoint="/api/send"
        actions={[{ action: "sendSelected", label: "Enviar correos", variant: "primary" }]}
        emptyLabel="No hay prospectos listos o programados para envio."
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
      />
    </div>
  );
}
