"use client";

import { useCallback, useEffect, useState } from "react";

type Finding = {
  id: string; field: string; currentValue: unknown; proposedValue: unknown;
  sourceName: string; sourceUrl: string; confidence: string;
  confidenceReason: string;
  status: string; decision: string; decidedBy: string; decidedAt: string | null;
};
type Research = {
  id: string; status: string; error: string; sourceResults: Record<string, { status: string; error?: string }> | null;
  createdAt: string; findings: Finding[];
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre del negocio", formattedAddress: "Dirección", website: "Sitio o perfil público",
  phone: "Teléfono", rating: "Calificación", userRatingCount: "Reseñas en Google", primaryType: "Giro detectado", mapsUrl: "Google Maps",
  businessStatus: "Estado del negocio", email: "Correo público", websiteFetchFailed: "El sitio no respondió",
  websiteLoadTimeMs: "Tiempo de respuesta (ms)", hasWhatsappCta: "Tiene enlace de WhatsApp",
  hasContactCta: "Tiene llamada a contacto", isMobileFriendly: "El sitio declara vista móvil",
};
const SOURCE_LABELS: Record<string, string> = { googlePlaces: "Google Places", brave: "Brave Search", website: "Sitio del negocio" };
const SOURCE_STATUS: Record<string, string> = { completed: "consultada", partial: "parcial", failed: "falló", skipped: "omitida" };
const FINDING_STATUS: Record<string, string> = { pending: "Pendiente de decisión", approved: "Aprobado", dismissed: "Descartado", stale: "Desactualizado" };

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "Sin dato";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

export function ProspectResearchReview({ prospectId }: { prospectId: string }) {
  const [researches, setResearches] = useState<Research[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/prospects/${prospectId}/research`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudo cargar el historial de investigación.");
    setResearches(data.researches || []);
  }, [prospectId]);

  useEffect(() => {
    void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function investigate() {
    setBusy("research"); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/prospects/${prospectId}/research`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo investigar.");
      await refresh();
      setNotice(data.findingCount ? `Investigación guardada: ${data.findingCount} propuesta(s) para revisar.` : "Investigación guardada. No se encontraron datos nuevos o distintos que cumplieran la verificación.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo investigar.");
      await refresh().catch(() => undefined);
    } finally { setBusy(""); }
  }

  async function decide(finding: Finding, decision: "approve" | "dismiss") {
    setBusy(finding.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/prospects/${prospectId}/research/${finding.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la decisión.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la decisión.");
      await refresh().catch(() => undefined);
    } finally { setBusy(""); }
  }

  return (
    <section className="panel" aria-labelledby="prospect-research-title">
      <div className="panel__header">
        <div>
          <h2 id="prospect-research-title">Investigar y verificar datos</h2>
          <p>Consulta manual. Los datos solo cambian cuando apruebas una propuesta.</p>
        </div>
        <button className="crm-button crm-button--secondary" type="button" disabled={Boolean(busy)} onClick={() => void investigate()}>
          {busy === "research" ? "Investigando…" : "Investigar ahora"}
        </button>
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {loading && <p>Cargando historial…</p>}
      {!loading && researches.length === 0 && <p>Aún no hay investigaciones registradas.</p>}
      <div className="prospect-research-list">
        {researches.map((research) => (
          <article className="prospect-research-entry" key={research.id}>
            <div className="prospect-research-entry__header">
              <strong>Investigación · {new Date(research.createdAt).toLocaleString("es-MX")}</strong>
              <span>{research.status === "completed" ? "Terminada" : research.status === "running" ? "En curso" : "Fallida"}</span>
            </div>
            {research.error && <p role="status">{research.error}</p>}
            {research.sourceResults && (
              <ul className="prospect-research-sources">
                {Object.entries(research.sourceResults).map(([source, result]) => (
                  <li key={source}><strong>{SOURCE_LABELS[source] || source}:</strong> {SOURCE_STATUS[result.status] || result.status}{result.error ? ` · ${result.error}` : ""}</li>
                ))}
              </ul>
            )}
            {research.findings.length === 0 && <p>No hubo propuestas verificables.</p>}
            {research.findings.map((finding) => (
              <div className="prospect-research-finding" key={finding.id}>
                <div className="prospect-research-finding__values">
                  <strong>{FIELD_LABELS[finding.field] || finding.field}</strong>
                  <span>Actual: {display(finding.currentValue)}</span>
                  <span>Propuesto: {display(finding.proposedValue)}</span>
                  <span>Confianza: {finding.confidence === "high" ? "Alta" : "Media"} · {finding.confidenceReason}</span>
                  <span>Fuente: {finding.sourceName} · consultada {new Date(research.createdAt).toLocaleString("es-MX")}</span>
                  <a href={finding.sourceUrl} target="_blank" rel="noreferrer">Abrir fuente</a>
                  {finding.status !== "pending" && <span>Decisión: {FINDING_STATUS[finding.status] || finding.status}{finding.decidedBy ? ` · ${finding.decidedBy}` : ""}{finding.decidedAt ? ` · ${new Date(finding.decidedAt).toLocaleString("es-MX")}` : ""}</span>}
                </div>
                {finding.status === "pending" && (
                  <div className="prospect-research-finding__actions">
                    <button className="crm-button crm-button--secondary" type="button" disabled={Boolean(busy)} onClick={() => void decide(finding, "approve")}>{busy === finding.id ? "Guardando…" : "Aprobar dato"}</button>
                    <button className="crm-button crm-button--secondary" type="button" disabled={Boolean(busy)} onClick={() => void decide(finding, "dismiss")}>Descartar</button>
                  </div>
                )}
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
