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
  title: "Sin poder contactar",
  description: "Prospectos que no pueden contactarse actualmente.",
};

export default async function UncontactablePage({
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
    statuses: ["uncontactable"],
    orderBy: "lastCheckedAt",
  });

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Sin contactar"
        title="Sin poder contactar"
        description="Registros apartados porque actualmente no tienen un canal válido de contacto."
      />
      <DashboardMetricCards data={context.data} />
      <DashboardSetupPanel setup={context.setup} />
      <ProspectTable
        title="Sin poder contactar"
        description="Estos registros quedan fuera de los envíos automáticos."
        records={items}
        endpoint="/api/prospects"
        actions={[]}
        emptyLabel="No hay prospectos en este estado."
        page={page}
        pageSize={25}
        totalCount={totalCount}
      />
    </div>
  );
}
