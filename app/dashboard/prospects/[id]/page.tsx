import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProspectDetail } from "@/lib/prospects";
import { buildProspectOutreachDraft } from "@/lib/outreach";
import { getLeadTypeLabel } from "@/lib/lead-types";
import { getProspectDisplayStatus } from "@/lib/prospect-status";
import { formatDashboardDateTime } from "@/lib/date-format";
import { StatusPill } from "@/components/dashboard/status-pill";
import { EmailPreview } from "./email-preview";
import { ManualContactActions } from "./manual-contact-actions";

export const dynamic = "force-dynamic";

type PageContext = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageContext): Promise<Metadata> {
  const { id } = await params;
  try {
    const prospect = await getProspectDetail(id);
    return {
      title: prospect.name,
      description: `${prospect.city} · ${getLeadTypeLabel(prospect.type)} · Score ${prospect.score}`,
    };
  } catch {
    return { title: "Prospecto" };
  }
}

export default async function ProspectDetailPage({ params }: PageContext) {
  const { id } = await params;

  let prospect: Awaited<ReturnType<typeof getProspectDetail>>;

  try {
    prospect = await getProspectDetail(id);
  } catch {
    notFound();
  }

  const draft = buildProspectOutreachDraft(prospect, "first_contact");
  const displayStatus = getProspectDisplayStatus(prospect.status, prospect.scheduledSendAt);
  const typeLabel = getLeadTypeLabel(prospect.type);

  return (
    <div className="page-stack">
      <div>
        <Link href="/dashboard/prospects" className="detail-back">
          ← Volver a Prospects
        </Link>
      </div>

      <header className="page-header">
        <span className="page-header__eyebrow">Prospects</span>
        <div className="detail-title-row">
          <h1>{prospect.name}</h1>
          <div className="detail-badges">
            <StatusPill status={displayStatus} />
            <span className={`priority-pill priority-pill--${prospect.priority}`}>
              {prospect.priority}
            </span>
          </div>
        </div>
        <p>
          {[prospect.city, typeLabel, `Score ${prospect.score}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <div className="detail-grid">
        {/* Columna principal */}
        <div className="detail-main">
          <div className="panel">
            <div className="panel__header">
              <div>
                <h2>Informacion</h2>
              </div>
            </div>
            <dl className="detail-dl">
              {prospect.email && (
                <>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${prospect.email}`}>{prospect.email}</a>
                  </dd>
                </>
              )}
              {prospect.phone && (
                <>
                  <dt>Telefono</dt>
                  <dd>{prospect.phone}</dd>
                </>
              )}
              {prospect.website && (
                <>
                  <dt>Sitio web</dt>
                  <dd>
                    <a href={prospect.website} target="_blank" rel="noreferrer">
                      {prospect.website}
                    </a>
                  </dd>
                </>
              )}
              {prospect.mapsUrl && (
                <>
                  <dt>Google Maps</dt>
                  <dd>
                    <a href={prospect.mapsUrl} target="_blank" rel="noreferrer">
                      Ver en Maps
                    </a>
                  </dd>
                </>
              )}
              {prospect.rating && (
                <>
                  <dt>Rating</dt>
                  <dd>{prospect.rating} ★</dd>
                </>
              )}
              {prospect.contactName && (
                <>
                  <dt>Contacto</dt>
                  <dd>{prospect.contactName}</dd>
                </>
              )}
            </dl>

            <div className="manual-contact-actions__wrap">
              <ManualContactActions
                prospectId={prospect.id}
                email={prospect.email}
                phone={prospect.phone}
                subject={prospect.subject || draft.subject}
                message={prospect.message || draft.message}
                name={prospect.name}
              />
            </div>
          </div>

          <div className="panel">
            <div className="panel__header">
              <div>
                <h2>Oportunidad detectada</h2>
              </div>
            </div>
            <dl className="detail-dl">
              <dt>Oportunidad</dt>
              <dd>{prospect.opportunity || draft.opportunity || "—"}</dd>
              <dt>Angulo de venta</dt>
              <dd>{prospect.pitchAngle || "—"}</dd>
              <dt>Tipo de sitio recomendado</dt>
              <dd>{prospect.recommendedSite || "—"}</dd>
            </dl>
          </div>

          <div className="panel">
            <div className="panel__header">
              <div>
                <h2>Preview del correo</h2>
                <p>
                  Variante{" "}
                  <strong>{draft.scriptVariant?.toUpperCase() ?? "—"}</strong> · primer
                  contacto
                </p>
              </div>
            </div>
            <div className="detail-subject">
              <span className="detail-subject__label">Asunto</span>
              <strong>{draft.subject}</strong>
            </div>
            {draft.html && <EmailPreview html={draft.html} text={draft.message} />}
          </div>
        </div>

        {/* Columna lateral */}
        <div className="detail-side">
          <div className="panel">
            <div className="panel__header">
              <div>
                <h2>Analisis</h2>
              </div>
            </div>
            <p className="detail-analysis">{draft.analysis}</p>
          </div>

          {prospect.subject && (
            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>Borrador guardado</h2>
                  <p>El que se enviara realmente</p>
                </div>
              </div>
              <div className="detail-subject">
                <span className="detail-subject__label">Asunto</span>
                <strong>{prospect.subject}</strong>
              </div>
              {prospect.message && (
                <pre className="detail-stored-message">{prospect.message}</pre>
              )}
            </div>
          )}

          {prospect.contactEvents.length > 0 && (
            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>Historial</h2>
                </div>
              </div>
              <ul className="detail-events">
                {prospect.contactEvents.map((event) => (
                  <li key={event.id} className="detail-event">
                    <span className="detail-event__type">{event.eventType}</span>
                    <span className="detail-event__date">
                      {formatDashboardDateTime(event.createdAt, { city: prospect.city })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prospect.scheduledSendAt && (
            <div className="panel panel--accent">
              <p style={{ margin: 0 }}>
                <strong>Envio programado</strong>
                <br />
                {formatDashboardDateTime(prospect.scheduledSendAt, {
                  city: prospect.city,
                })}
              </p>
            </div>
          )}

          {prospect.lastContactedAt && (
            <div className="panel">
              <dl className="detail-dl">
                <dt>Ultimo contacto</dt>
                <dd>
                  {formatDashboardDateTime(prospect.lastContactedAt, {
                    city: prospect.city,
                  })}
                </dd>
                <dt>Follow-ups enviados</dt>
                <dd>{prospect.followupCount}</dd>
                <dt>Etapa</dt>
                <dd>{prospect.followupStage}</dd>
              </dl>
            </div>
          )}

          <div className="panel">
            <dl className="detail-dl">
              <dt>Creado</dt>
              <dd>{formatDashboardDateTime(prospect.createdAt)}</dd>
              <dt>Actualizado</dt>
              <dd>{formatDashboardDateTime(prospect.lastCheckedAt)}</dd>
              {prospect.source && (
                <>
                  <dt>Fuente</dt>
                  <dd>{prospect.source}</dd>
                </>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
