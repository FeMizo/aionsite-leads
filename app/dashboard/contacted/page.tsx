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
  title: "Contactados",
  description: "Seguimiento de prospectos ya contactados, respondidos o cerrados.",
};

const PAGE_SIZE = 25;

export default async function ContactedPage({
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
    statuses: ["contacted", "replied", "closed"],
    page,
    pageSize: PAGE_SIZE,
    orderBy: "lastCheckedAt",
  });

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
        description="Registros ya contactados o cerrados."
        records={items}
        endpoint="/api/prospects"
        actions={[{ action: "markAsClient", label: "Marcar cliente", variant: "primary" }]}
        emptyLabel="Todavia no hay contactados."
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
      />
    </div>
  );
}
