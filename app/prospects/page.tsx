import { GeneratedHandoff } from "@/components/crm/generated-handoff";
import { PageHeader } from "@/components/crm/page-header";
import { RecordsTable } from "@/components/crm/records-table";
import type { CrmRecord } from "@/types/crm";
import { loadCrmState } from "@/utils/crm";

export const dynamic = "force-dynamic";

export default function ProspectsPage() {
  const state = loadCrmState();

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Prospects"
        title="Prospectos activos"
        description="Lista activa para revisar, enviar, reintentar fallidos y archivar cuando no interesen."
      />
      <GeneratedHandoff generatedCount={state.generated.length} />
      <RecordsTable
        title="Prospects"
        description="Selecciona uno o varios prospectos para enviar correo o administrarlos."
        records={state.prospects as CrmRecord[]}
        actions={[
          { action: "sendEmails", label: "Enviar correos", variant: "primary" },
          { action: "restoreFailed", label: "Reactivar fallidos" },
          { action: "archiveRecords", label: "Archivar" },
          { action: "deleteRecords", label: "Eliminar", variant: "danger" },
        ]}
        emptyLabel="No hay prospectos activos en este momento."
      />
    </div>
  );
}
