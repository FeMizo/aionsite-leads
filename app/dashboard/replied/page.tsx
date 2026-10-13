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
  title: "Respondidos",
  description: "Prospectos que respondieron al contacto.",
};

const PAGE_SIZE = 25;

export default async function RepliedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const context = await getDashboardPageContext({ includeCollections: false });

  if (context.kind !== "ready") {
    return <DashboardUnavailable context={context as DashboardPageContext} />;
  }

  const { items, totalCount } = await getProspectsByStatuses({
    statuses: ["replied"],
    orderBy: "lastCheckedAt",
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Respondidos"
        title="Prospectos que respondieron"
        description="Consulta únicamente los prospectos que ya respondieron al contacto."
      />
      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />
      <ProspectTable
        title="Respondidos"
        description="Registros con respuesta recibida."
        records={items}
        endpoint="/api/prospects"
        actions={[]}
        emptyLabel="No hay prospectos respondidos."
        page={page}
        pageSize={25}
        totalCount={totalCount}
      />
    </div>
  );
}
