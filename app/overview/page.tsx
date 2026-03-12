import { DashboardCards } from "@/components/crm/dashboard-cards";
import { PageHeader } from "@/components/crm/page-header";
import { QuickActions } from "@/components/crm/quick-actions";
import { HistoryTable } from "@/components/crm/history-table";
import type { CrmHistoryEntry, OverviewMetrics } from "@/types/crm";
import { getOverviewMetrics, loadCrmState } from "@/utils/crm";

export const dynamic = "force-dynamic";

export default function OverviewPage() {
  const state = loadCrmState();
  const metrics = getOverviewMetrics(state) as OverviewMetrics;
  const recentHistory = [...state.history]
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, 8) as CrmHistoryEntry[];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Overview"
        title="Mini CRM de Prospeccion"
        description="Visualiza generated, prospects, contacted, failed y el historial operativo completo desde una sola interfaz."
      />
      <DashboardCards metrics={metrics} />
      <QuickActions />
      <HistoryTable entries={recentHistory} />
    </div>
  );
}
