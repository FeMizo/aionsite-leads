import { HistoryTable } from "@/components/crm/history-table";
import { PageHeader } from "@/components/crm/page-header";
import type { CrmHistoryEntry } from "@/types/crm";
import { loadCrmState } from "@/utils/crm";

export const dynamic = "force-dynamic";

export default function HistoryPage() {
  const state = loadCrmState();
  const entries = [...state.history].sort((left, right) =>
    right.at.localeCompare(left.at)
  ) as CrmHistoryEntry[];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="History"
        title="Historial operativo"
        description="Rastrea generacion, movimientos de pipeline, envios exitosos y errores."
      />
      <HistoryTable entries={entries} />
    </div>
  );
}
