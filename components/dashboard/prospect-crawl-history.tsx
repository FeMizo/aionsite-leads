"use client";

import { useCallback, useEffect, useState } from "react";

type CrawlEntry = {
  id: string;
  ownerUsername: string;
  crawlOwnerUserId: string;
  siteUrl: string;
  crawlSiteRunId: string;
  status: "pending" | "running" | "failed" | "completed";
  error: string;
  summary: unknown;
  summaryText?: string;
  pdfFilename: string;
  createdAt: string;
};

export function ProspectCrawlHistory({ prospectId, website }: { prospectId: string; website: string }) {
  const [history, setHistory] = useState<CrawlEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/prospects/${prospectId}/crawl`, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo consultar el historial.");
    const data = await response.json();
    setHistory(data.history || []);
  }, [prospectId]);

  useEffect(() => { void refresh().catch(() => setError("No se pudo consultar el historial.")); }, [refresh]);

  async function start(retry = false) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/prospects/${prospectId}/crawl`, {
        method: "POST",
        headers: retry ? { "x-crawl-retry": "1" } : undefined,
      });
      const data = await response.json();
      if (data.crawl) setHistory((previous) => [data.crawl, ...previous.filter((item) => item.id !== data.crawl.id)]);
      if (!response.ok) throw new Error(data.error || data.crawl?.error || "No se pudo completar el rastreo.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar el rastreo.");
      await refresh().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  const latest = history[0];

  return (
    <section className="panel" aria-labelledby="crawl-history-title">
      <div className="panel__header">
        <div>
          <h2 id="crawl-history-title">Rastreo del sitio</h2>
          <p>El informe se guarda en el historial privado de este prospecto.</p>
        </div>
        <button className="crm-button crm-button--secondary" type="button" disabled={!website || busy} onClick={() => void start(latest?.status === "failed" || latest?.status === "completed")}>
          {busy ? "Revisando…" : latest?.status === "pending" || latest?.status === "running" ? "Consultar estado" : latest?.status === "failed" ? "Reintentar" : latest?.status === "completed" ? "Volver a revisar" : "Revisar sitio"}
        </button>
      </div>
      {!website && <p>Este prospecto no tiene un sitio web para revisar.</p>}
      {error && <p role="alert">{error}</p>}
      {!latest && <p>Aún no hay rastreos registrados.</p>}
      <ul className="detail-events">
        {history.map((crawl) => (
          <li key={crawl.id} className="detail-event">
            <span><strong>{crawl.siteUrl}</strong> · {crawl.status} · {new Date(crawl.createdAt).toLocaleString("es-MX")}</span>
            {crawl.ownerUsername && <span>Usuario Leads: {crawl.ownerUsername}</span>}
            {crawl.crawlOwnerUserId && <span>Usuario Crawl-Site: {crawl.crawlOwnerUserId}</span>}
            {crawl.status === "completed" && <span>{crawl.summaryText || "Consulta el PDF para ver los hallazgos."}</span>}
            {crawl.status === "failed" && crawl.error && <span>{crawl.error}</span>}
            {crawl.pdfFilename && <a href={`/api/prospects/${prospectId}/crawl?crawlId=${encodeURIComponent(crawl.id)}`}>Descargar {crawl.pdfFilename}</a>}
          </li>
        ))}
      </ul>
    </section>
  );
}
