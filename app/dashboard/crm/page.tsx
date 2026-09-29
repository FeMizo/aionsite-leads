import type { Metadata } from "next";
import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { CrmWorkspace } from "@/components/dashboard/crm-workspace";
import { DashboardPageContext, DashboardSetupPanel, DashboardUnavailable, getDashboardPageContext } from "@/components/dashboard/dashboard-sections";
import { ManualProspectPanel } from "@/components/dashboard/manual-prospect-panel";
import { PageHeader } from "@/components/crm/page-header";
import { getAllDashboardProspects } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prospectos",
  description: "Gestión completa de prospectos, estados, filtros y acciones comerciales.",
};

export default async function CrmPage() {
  const context = await getDashboardPageContext();

  if (context.kind !== "ready") {
    return <DashboardUnavailable context={context as DashboardPageContext} />;
  }

  const records = await getAllDashboardProspects();

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Prospectos"
        title="Pipeline comercial"
        description="Filtra por etapa, selecciona prospectos y ejecuta acciones comerciales sin mezclar el flujo de empleos."
      />
      <DashboardSetupPanel setup={context.setup} />
      <DashboardActions
        generatedCount={context.data.metrics.generated}
        crawlInProgress={context.data.crawlInProgress}
        activeRunCreatedAt={context.data.activeRun?.createdAt || null}
      />
      <ManualProspectPanel />
      <CrmWorkspace records={records} />
    </div>
  );
}
