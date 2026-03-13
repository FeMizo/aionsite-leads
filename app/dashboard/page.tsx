import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { ProspectTable } from "@/components/dashboard/prospect-table";
import { RunsTable } from "@/components/dashboard/runs-table";
import { PageHeader } from "@/components/crm/page-header";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Dashboard"
        title="Prospecting pipeline en Vercel + Postgres"
        description="Visualiza generated, activos, contactados y corridas recientes desde una sola vista operativa."
      />

      <section className="crm-cards">
        <article className="crm-card">
          <span className="crm-card__label">Generated</span>
          <strong className="crm-card__value">{data.metrics.generated}</strong>
        </article>
        <article className="crm-card">
          <span className="crm-card__label">Prospects</span>
          <strong className="crm-card__value">{data.metrics.prospects}</strong>
        </article>
        <article className="crm-card">
          <span className="crm-card__label">Contacted</span>
          <strong className="crm-card__value">{data.metrics.contacted}</strong>
        </article>
        <article className="crm-card">
          <span className="crm-card__label">Failed</span>
          <strong className="crm-card__value">{data.metrics.failed}</strong>
        </article>
        <article className="crm-card">
          <span className="crm-card__label">Runs</span>
          <strong className="crm-card__value">{data.metrics.runs}</strong>
        </article>
      </section>

      <DashboardActions generatedCount={data.metrics.generated} />

      <ProspectTable
        title="Generated"
        description="Prospectos detectados por la ultima corrida, pendientes de aprobar."
        records={data.generated}
        endpoint="/api/prospects"
        actions={[
          { action: "approveGenerated", label: "Aprobar", variant: "primary" },
          { action: "archiveRecords", label: "Archivar" },
          { action: "deleteRecords", label: "Eliminar", variant: "danger" },
        ]}
        emptyLabel="No hay registros generated."
      />

      <ProspectTable
        title="Prospects"
        description="Cola activa para envio o reactivacion de fallidos."
        records={data.prospects}
        endpoint="/api/prospects"
        actions={[
          { action: "restoreFailed", label: "Reactivar fallidos" },
          { action: "archiveRecords", label: "Archivar" },
          { action: "deleteRecords", label: "Eliminar", variant: "danger" },
        ]}
        emptyLabel="No hay prospectos activos."
      />

      <ProspectTable
        title="Enviar seleccionados"
        description="Selecciona prospectos activos para disparar SMTP desde la plataforma."
        records={data.prospects.filter((record) => record.status === "prospect")}
        endpoint="/api/send"
        actions={[{ action: "sendSelected", label: "Enviar correos", variant: "primary" }]}
        emptyLabel="No hay prospectos listos para envio."
      />

      <ProspectTable
        title="Contactados"
        description="Ultimos registros ya contactados o cerrados."
        records={data.contacted}
        endpoint="/api/prospects"
        actions={[{ action: "markAsClient", label: "Marcar cliente", variant: "primary" }]}
        emptyLabel="Todavia no hay contactados."
      />

      <RunsTable runs={data.runs} />
    </div>
  );
}
