import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { PageHeader } from "@/components/crm/page-header";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { formatDashboardDateTime } from "@/lib/date-format";
import { getDashboardData } from "@/lib/dashboard";
import { getAppSetupState } from "@/lib/env";
import type { DashboardData } from "@/lib/types";
import type { ReactNode } from "react";

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
    label: "Generados",
    description: "Prospectos nuevos o analizados pendientes de decision.",
    metricKey: "generated",
  },
  {
    href: "/dashboard/prospects",
    label: "Prospectos",
    description: "Prospectos aprobados pendientes de preparar mensaje.",
    metricKey: "prospects",
  },
  {
    href: "/dashboard/send",
    label: "Enviar",
    description: "Prospectos listos con mensaje y prioridad alta.",
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

        <Banner
          title="Configuracion pendiente"
          description="Agrega estas variables en tu entorno local y en Vercel para habilitar el dashboard completo."
        >
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
        </Banner>
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

        <Banner
          title="Conexion fallida"
          description="Revisa tu variable de Postgres, corre `npm run db:deploy` sobre la base objetivo y vuelve a abrir el dashboard."
        >
          <p className="crm-error">{context.message}</p>
        </Banner>
      </div>
    );
  }

  return null;
}

export function DashboardMetricCards({ data }: { data: DashboardData }) {
  return (
    <section className="crm-cards">
      {sectionCards.map((item) => (
        <Card
          key={item.href}
          href={item.href}
          label={item.label}
          value={data.metrics[item.metricKey]}
          meta={item.description}
        />
      ))}
    </section>
  );
}

function formatActivityDate(value: string | undefined) {
  if (!value) {
    return "Sin registro";
  }

  return formatDashboardDateTime(value);
}

export function DashboardActivitySummary({ data }: { data: DashboardData }) {
  const crawlLabel = data.crawlInProgress
    ? "Crawl en progreso"
    : data.lastCrawl?.status === "failed"
      ? "Ultimo crawl con error"
      : "Ultimo crawl";

  return (
    <div className="panel panel--flush">
      <div className="stat-bar">
        <div className="stat-bar__item">
          <p className="stat-bar__label">{crawlLabel}</p>
          <p className="stat-bar__value">
            {formatActivityDate(data.activeRun?.createdAt || data.lastCrawl?.at)}
          </p>
          <p className="stat-bar__sub">
            {data.activeRun
              ? "La busqueda actual sigue ejecutandose."
              : data.lastCrawl
                ? `${data.lastCrawl.source || "Pipeline"} · ${data.lastCrawl.status || "completed"}`
                : "Todavia no hay busquedas registradas."}
          </p>
        </div>
        <div className="stat-bar__item">
          <p className="stat-bar__label">Siguiente crawl automatico</p>
          <p className="stat-bar__value">{formatActivityDate(data.nextCrawlAt)}</p>
          <p className="stat-bar__sub">Lun · Mie · Vie a las 9am UTC</p>
        </div>
        <div className="stat-bar__item">
          <p className="stat-bar__label">Ultimo envio</p>
          <p className="stat-bar__value">{formatActivityDate(data.lastSend?.at)}</p>
          <p className="stat-bar__sub">
            {data.lastSend
              ? `${data.lastSend.prospectName || "Prospecto"}${
                  data.lastSend.email ? ` · ${data.lastSend.email}` : ""
                }`
              : "Todavia no se ha enviado ningun correo."}
          </p>
        </div>
        <div className="stat-bar__item">
          <p className="stat-bar__label">Estado operativo</p>
          <p className="stat-bar__value">
            {data.crawlInProgress ? "Procesando" : "Disponible"}
          </p>
          <p className="stat-bar__sub">
            {data.crawlInProgress
              ? "El dashboard se refresca automaticamente."
              : "Puedes lanzar un crawl manual o continuar con envios."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DashboardSetupPanel({ setup }: { setup: DashboardSetupState }) {
  if (setup.googlePlacesConfigured && setup.smtpConfigured) {
    return null;
  }

  return (
    <Section
      title="Servicios pendientes"
      description="El dashboard ya puede leer la base, pero estas integraciones siguen incompletas para operar todo el flujo."
    >
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
            {setup.missingSmtpEnv.join(", ") || "Configurado y listo para enviar correos"}
          </p>
        </article>
        <article>
          <h3>Migraciones</h3>
          <p>Ejecuta `npm run db:deploy` en la base de Vercel antes de usar el dashboard en produccion.</p>
        </article>
      </div>
    </Section>
  );
}

export function DashboardOverview({
  data,
  setup,
  children,
}: {
  data: DashboardData;
  setup: DashboardSetupState;
  children?: ReactNode;
}) {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Dashboard"
        title="Prospecting pipeline en Vercel + Postgres"
        description="Gestiona todo el pipeline desde una sola vista. Filtra por etapa, ejecuta acciones y actualiza estados sin cambiar de pantalla."
      />

      <DashboardMetricCards data={data} />
      <DashboardActivitySummary data={data} />
      <DashboardSetupPanel setup={setup} />
      <DashboardActions
        generatedCount={data.metrics.generated}
        crawlInProgress={data.crawlInProgress}
        activeRunCreatedAt={data.activeRun?.createdAt || null}
      />

      {children}

    </div>
  );
}
