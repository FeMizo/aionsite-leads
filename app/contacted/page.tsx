import { PageHeader } from "@/components/crm/page-header";
import { RecordsTable } from "@/components/crm/records-table";
import type { CrmRecord } from "@/types/crm";
import { loadCrmState } from "@/utils/crm";

export const dynamic = "force-dynamic";

export default function ContactedPage() {
  const state = loadCrmState();

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Contacted"
        title="Contactados y enviados"
        description="Registros contactados. Si pasan mas de 30 dias sin respuesta se mueven a failed, excepto los marcados como cliente."
      />
      <RecordsTable
        title="Contacted"
        description="Consulta fecha de contacto, marca clientes para excluirlos del auto-fail y archiva si ya no deben aparecer en el flujo."
        records={state.contacted as CrmRecord[]}
        actions={[
          { action: "markAsClient", label: "Marcar como cliente", variant: "primary" },
          { action: "archiveRecords", label: "Archivar" },
          { action: "deleteRecords", label: "Eliminar", variant: "danger" },
        ]}
        emptyLabel="Todavia no hay prospectos contactados."
        showSendDate
        sendDateLabel="Contactado"
      />
    </div>
  );
}
