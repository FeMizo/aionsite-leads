import Link from "next/link";
import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { PageHeader } from "@/components/crm/page-header";
import { getDashboardData } from "@/lib/dashboard";
import { getAppSetupState } from "@/lib/env";
import type { DashboardData } from "@/lib/types";

type DashboardSetupState = ReturnType<typeof getAppSetupState>;

type DashboardReadyContext = {
  kind: "ready";
  data: DashboardData;
  setup: DashboardSetupState;
};

type DashboardSetupContext = {
  kind: "setup";
  setup: DashboardSetupState;
};

type DashboardErrorContext = {
  kind: "error";
  setup: DashboardSetupState;
  message: string;
};

export type DashboardPageContext =
  | DashboardReadyContext
  | DashboardSetupContext
  | DashboardErrorContext;

const sectionCards = [
  {
    href: "/dashboard/generated",
    label: "Generated",
    description: "Prospectos nuevos o analizados pendientes de decision.",
    metricKey: "generated",
  },
  {
    href: "/dashboard/prospects",
    label: "Prospects",
    description: "Prospectos approved pendientes de preparar mensaje.",
    metricKey: "prospects",
  },
  {
    href: "/dashboard/send",
    label: "Envios",
    description: "Prospectos en estado ready con draft y prioridad alta.",
    metricKey: "ready",
  },
  {
    href: "/dashboard/contacted",
    label: "Contactados",
    description: "Seguimiento de replies, cierres y clientes.",
    metricKey: "contacted",
  },
  {
    href: "/dashboard/runs",
    label: "Busquedas",
    description: "Metricas y estado del pipeline automatizado.",
    metricKey: "runs",
  },
] as const;

export async function getDashboardPageContext(): Promise<DashboardPageContext> {
  const setup = getAppSetupState();

  if (!setup.databaseConfigured) {
    return {
      kind: "setup",
      setup,
    };
  }

  try {
    const data = await getDashboardData();

    return {
      kind: "ready",
      data,
      setup,
    };
  } catch (error) {
    return {
      kind: "error",
      setup,
      message: error instanceof Error ? error.message : "No se pudo consultar Postgres.",
    };
  }
}

export function DashboardUnavailable({ context }: { context: DashboardPageContext }) {
  if (context.kind === "setup") {
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
              <p>{context.setup.missingDatabaseEnv.join(", ") || "Configurada"}</p>
            </article>
            <article>
              <h3>Pipeline</h3>
              <p>
                {context.setup.missingGooglePlacesEnv.join(", ") ||
                  "Google Places configurado"}
              </p>
            </article>
            <article>
              <h3>SMTP</h3>
              <p>{context.setup.missingSmtpEnv.join(", ") || "SMTP configurado"}</p>
            </article>
          </div>
        </section>
      </div>
    );
  }

  if (context.kind === "error") {
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
                Revisa tu variable de Postgres, corre `npm run db:deploy` sobre la base objetivo y vuelve a abrir el dashboard.
              </p>
            </div>
          </div>
          <p className="crm-error">{context.message}</p>
        </section>
      </div>
    );
  }

  return null;
}

export function DashboardMetricCards({ data }: { data: DashboardData }) {
  return (
    <section className="crm-cards">
      {sectionCards.map((item) => (
        <Link key={item.href} href={item.href} className="crm-card crm-card--link">
          <span className="crm-card__label">{item.label}</span>
          <strong className="crm-card__value">{data.metrics[item.metricKey]}</strong>
          <span className="crm-card__meta">{item.description}</span>
        </Link>
      ))}
    </section>
  );
}

function formatActivityDate(value: string | undefined) {
  if (!value) {
    return "Sin registro";
  }

  return new Date(value).toLocaleString();
}

export function DashboardActivitySummary({ data }: { data: DashboardData }) {
  const crawlLabel = data.crawlInProgress
    ? "Crawl en progreso"
    : data.lastCrawl?.status === "failed"
      ? "Ultimo crawl con error"
      : "Ultimo crawl";

  return (
    <section className="settings-grid">
      <article className="activity-card">
        <h3>{crawlLabel}</h3>
        <p className="activity-card__value">{formatActivityDate(data.activeRun?.createdAt || data.lastCrawl?.at)}</p>
        <p>
          {data.activeRun
            ? "La busqueda actual sigue ejecutandose."
            : data.lastCrawl
              ? `${data.lastCrawl.source || "Pipeline"} · ${data.lastCrawl.status || "completed"}`
              : "Todavia no hay busquedas registradas."}
        </p>
      </article>
      <article className="activity-card">
        <h3>Ultimo envio</h3>
        <p className="activity-card__value">{formatActivityDate(data.lastSend?.at)}</p>
        <p>
          {data.lastSend
            ? `${data.lastSend.prospectName || "Prospecto"}${data.lastSend.email ? ` · ${data.lastSend.email}` : ""}`
            : "Todavia no se ha enviado ningun correo."}
        </p>
      </article>
      <article className="activity-card">
        <h3>Estado operativo</h3>
        <p className="activity-card__value">
          {data.crawlInProgress ? "Procesando" : "Disponible"}
        </p>
        <p>
          {data.crawlInProgress
            ? "El dashboard se refresca automaticamente mientras termina el crawl."
            : "Puedes lanzar un crawl manual o continuar con envios y seguimiento."}
        </p>
      </article>
    </section>
  );
}

export function DashboardSetupPanel({ setup }: { setup: DashboardSetupState }) {
  if (setup.googlePlacesConfigured && setup.smtpConfigured) {
    return null;
  }

  return (
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
              "Configurado y listo para busquedas manuales o cron"}
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
  );
}

export function DashboardOverview({
  data,
  setup,
}: {
  data: DashboardData;
  setup: DashboardSetupState;
}) {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Dashboard"
        title="Prospecting pipeline en Vercel + Postgres"
        description="Usa el lateral para navegar por generated, activos, envios, contactados y busquedas sin cargar todo en la misma pantalla."
      />

      <DashboardMetricCards data={data} />
      <DashboardActivitySummary data={data} />
      <DashboardSetupPanel setup={setup} />
      <DashboardActions
        generatedCount={data.metrics.generated}
        crawlInProgress={data.crawlInProgress}
        activeRunCreatedAt={data.activeRun?.createdAt || null}
      />

      <section className="panel">
        <div className="panel__header">
          <div>
            <h2>Secciones del CRM</h2>
            <p>
              Cada vista concentra una parte del flujo operativo para reducir ruido y trabajar por etapa.
            </p>
          </div>
        </div>

        <div className="settings-grid">
          <article>
            <h3>Generated</h3>
            <p>Analiza, aprueba o rechaza los prospectos capturados por la ultima busqueda.</p>
          </article>
          <article>
            <h3>Prospects y Envios</h3>
            <p>Trabaja approved en Prospects y deja que los ready vivan solo en Envios para evitar duplicados visuales.</p>
          </article>
          <article>
            <h3>Contactados y Busquedas</h3>
            <p>Consulta seguimiento comercial y la salud operativa del pipeline.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
