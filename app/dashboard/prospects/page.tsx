import type { Metadata } from "next";
import { ProspectTable } from "@/components/dashboard/prospect-table";
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
  title: "Prospects",
  description: "Prospectos aprobados pendientes de preparar mensaje antes del envio.",
};

const PAGE_SIZE = 25;

export default async function ProspectsPage({
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
    statuses: ["approved"],
    page,
    pageSize: PAGE_SIZE,
  });

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
        records={items}
        endpoint="/api/prospects"
        actions={[
          { action: "generateDrafts", label: "Preparar mensaje", variant: "primary" },
          { action: "rejectRecords", label: "Rechazar", variant: "danger" },
        ]}
        emptyLabel="No hay prospectos approved pendientes."
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
      />
    </div>
  );
}
