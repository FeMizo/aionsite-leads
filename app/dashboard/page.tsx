import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { ProspectTable } from "@/components/dashboard/prospect-table";
import { RunsTable } from "@/components/dashboard/runs-table";
import { PageHeader } from "@/components/crm/page-header";
import { getDashboardData } from "@/lib/dashboard";
import { getAppSetupState } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const setup = getAppSetupState();

  if (!setup.databaseConfigured) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Dashboard"
          title="Configura la base de datos para activar el CRM"
          description="El proyecto ya esta listo para Vercel, pero necesitas conectar Postgres antes de poder leer y operar prospectos."
        />

        <section className="panel panel--accent">
          <div className="panel__header">
            <div>
              <h2>Configuracion pendiente</h2>
              <p>
                Agrega estas variables en tu entorno local y en Vercel para habilitar el dashboard completo.
              </p>
            </div>
          </div>

          <div className="settings-grid">
            <article>
              <h3>Base de datos</h3>
              <p>{setup.missingDatabaseEnv.join(", ") || "Configurada"}</p>
            </article>
            <article>
              <h3>Pipeline</h3>
              <p>
                {setup.missingGooglePlacesEnv.join(", ") ||
                  "Google Places configurado"}
              </p>
            </article>
            <article>
              <h3>SMTP</h3>
              <p>{setup.missingSmtpEnv.join(", ") || "SMTP configurado"}</p>
            </article>
          </div>
        </section>
      </div>
    );
  }

  let data;

  try {
    data = await getDashboardData();
  } catch (error) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Dashboard"
          title="La base de datos no responde todavia"
          description="La aplicacion ya compila y esta lista para Vercel, pero la conexion actual a Postgres no pudo completarse."
        />

        <section className="panel panel--accent">
          <div className="panel__header">
            <div>
              <h2>Conexion fallida</h2>
              <p>
                Revisa `DATABASE_URL`, corre `npm run db:deploy` sobre la base objetivo y vuelve a abrir el dashboard.
              </p>
            </div>
          </div>
          <p className="crm-error">
            {error instanceof Error ? error.message : "No se pudo consultar Postgres."}
          </p>
        </section>
      </div>
    );
  }

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

      {!setup.googlePlacesConfigured || !setup.smtpConfigured ? (
        <section className="panel">
          <div className="panel__header">
            <div>
              <h2>Servicios pendientes</h2>
              <p>
                El dashboard ya puede leer la base, pero estas integraciones siguen incompletas para operar todo el flujo.
              </p>
            </div>
          </div>

          <div className="settings-grid">
            <article>
              <h3>Google Places</h3>
              <p>
                {setup.missingGooglePlacesEnv.join(", ") ||
                  "Configurado y listo para corridas manuales o cron"}
              </p>
            </article>
            <article>
              <h3>SMTP</h3>
              <p>
                {setup.missingSmtpEnv.join(", ") ||
                  "Configurado y listo para enviar correos"}
              </p>
            </article>
            <article>
              <h3>Migraciones</h3>
              <p>Ejecuta `npm run db:deploy` en la base de Vercel antes de usar el dashboard en produccion.</p>
            </article>
          </div>
        </section>
      ) : null}

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
