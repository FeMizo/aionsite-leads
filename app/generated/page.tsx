import { PageHeader } from "@/components/crm/page-header";
import { QuickActions } from "@/components/crm/quick-actions";
import { RecordsTable } from "@/components/crm/records-table";
import type { CrmRecord } from "@/types/crm";
import { loadCrmState } from "@/utils/crm";

export const dynamic = "force-dynamic";

export default function GeneratedPage() {
  const state = loadCrmState();

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Generated"
        title="Bandeja de prospectos generados"
        description="Aqui revisas los registros nuevos antes de aprobarlos y moverlos a la lista activa."
      />
      <QuickActions />
      <RecordsTable
        title="Generated"
        description="Aprueba, archiva o elimina nuevos prospectos generados por el script."
        records={state.generated as CrmRecord[]}
        actions={[
          { action: "approveGenerated", label: "Mover a Prospectos", variant: "primary" },
          { action: "archiveRecords", label: "Archivar" },
          { action: "deleteRecords", label: "Eliminar", variant: "danger" },
        ]}
        emptyLabel="No hay prospectos recien generados."
      />
    </div>
  );
}
