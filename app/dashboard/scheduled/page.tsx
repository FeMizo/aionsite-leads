import type { Metadata } from "next";
import { ProspectTable } from "@/components/dashboard/prospect-table";
import { DashboardMetricCards, DashboardPageContext, DashboardSetupPanel, DashboardUnavailable, getDashboardPageContext } from "@/components/dashboard/dashboard-sections";
import { getProspectsByStatuses } from "@/lib/dashboard";
import { PageHeader } from "@/components/crm/page-header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Programados", description: "Prospectos con envío programado." };

export default async function ScheduledPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const context = await getDashboardPageContext();
  if (context.kind !== "ready") return <DashboardUnavailable context={context as DashboardPageContext} />;

  const { items, totalCount } = await getProspectsByStatuses({ statuses: ["ready"], scheduledOnly: true, orderBy: "createdAt" });

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Programados" title="Envíos programados" description="Prospectos con fecha futura de envío." />
      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />
      <ProspectTable title="Programados" description="Registros pendientes de llegar a su fecha de envío." records={items} endpoint="/api/prospects" actions={[]} emptyLabel="No hay prospectos programados." page={page} pageSize={25} totalCount={totalCount} />
    </div>
  );
}
