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
import { getProspectsByStatuses } from "@/lib/dashboard";
import { PageHeader } from "@/components/crm/page-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enviar",
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

  const { items: readyItems, totalCount: readyTotalCount } = await getProspectsByStatuses({
    statuses: ["ready"],
    unscheduledOnly: true,
  });
  const { items: scheduledItems, totalCount: scheduledTotalCount } = await getProspectsByStatuses({
    statuses: ["ready"],
    scheduledOnly: true,
  });

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Envios"
        title="Envío de correos"
        description="Los envíos listos y los programados se muestran en secciones separadas."
      />

      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />
      <ManualProspectPanel />

      <ProspectTable
        title="Listos para enviar"
        description="Selecciona prospectos sin fecha programada para enviarlos ahora o programarlos."
        records={readyItems}
        endpoint="/api/send"
        actions={[{ action: "sendSelected", label: "Enviar correos", variant: "primary" }]}
        emptyLabel="No hay prospectos listos para enviar."
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={readyTotalCount}
      />

      <ProspectTable
        title="Programados"
        description="Estos prospectos esperan automáticamente su fecha y hora de envío."
        records={scheduledItems}
        endpoint="/api/prospects"
        actions={[]}
        emptyLabel="No hay prospectos programados."
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={scheduledTotalCount}
      />
    </div>
  );
}
