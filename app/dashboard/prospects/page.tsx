import type { Metadata } from "next";
import { ProspectTable } from "@/components/dashboard/prospect-table";
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
  title: "Prospectos",
  description: "Prospectos aprobados pendientes de preparar mensaje antes del envío.",
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

  const { items, totalCount } = await getProspectsByStatuses({
    statuses: ["approved"],
  });

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Prospectos"
        title="Cola activa"
        description="Administra prospectos aprobados antes del envío. Los listos viven en la sección de envíos."
      />

      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />

      <ProspectTable
        title="Prospectos"
        description="Aquí trabajas los aprobados. Cuando preparas el mensaje, pasan a listos y aparecen en envíos."
        records={items}
        endpoint="/api/prospects"
        actions={[
          { action: "generateDrafts", label: "Preparar mensaje", variant: "primary" },
          { action: "rejectRecords", label: "Rechazar", variant: "danger" },
        ]}
        emptyLabel="No hay prospectos aprobados pendientes."
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
      />
    </div>
  );
}
