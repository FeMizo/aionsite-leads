"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatDashboardDateTime } from "@/lib/date-format";

async function postJson(url: string, payload?: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(body, "No se pudo completar la accion."));
  }
}

type DashboardActionsProps = {
  generatedCount: number;
  crawlInProgress?: boolean;
  activeRunCreatedAt?: string | null;
};

export function DashboardActions({
  generatedCount,
  crawlInProgress = false,
  activeRunCreatedAt = null,
}: DashboardActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!crawlInProgress) {
      return;
    }

    const interval = window.setInterval(() => {
      router.refresh();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [crawlInProgress, router]);

  const isCrawlActive = crawlInProgress || isPending;

  function run(task: () => Promise<void>) {
    setError("");

    startTransition(async () => {
      try {
        await task();
        router.refresh();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo completar la accion."
        );
      }
    });
  }

  return (
    <section className="panel panel--accent">
      <div className="panel__header">
        <div>
          <h2>Acciones operativas</h2>
          <p>Lanza una busqueda manual, aprueba prospectos analizados o envia correos listos.</p>
        </div>
        <span
          className={`run-status ${isCrawlActive ? "is-running" : "is-ok"}`}
          title={
            activeRunCreatedAt
              ? `Crawl iniciado: ${formatDashboardDateTime(activeRunCreatedAt)}`
              : ""
          }
        >
          {isCrawlActive ? "crawl en progreso" : "crawl inactivo"}
        </span>
      </div>
      <div className="panel__actions">
        <button
          type="button"
          className="crm-button crm-button--primary"
          onClick={() => run(() => postJson("/api/cron"))}
          disabled={isCrawlActive}
        >
          {isCrawlActive ? "Ejecutando crawl..." : "Ejecutar busqueda"}
        </button>
        <button
          type="button"
          className="crm-button crm-button--secondary"
          onClick={() =>
            run(() =>
              postJson("/api/prospects", {
                action: "approveAllGenerated",
              })
            )
          }
          disabled={isPending || generatedCount === 0}
        >
          Aprobar pendientes
        </button>
        <button
          type="button"
          className="crm-button crm-button--secondary"
          onClick={() => run(() => postJson("/api/send", {}))}
          disabled={isPending}
        >
          Enviar prospectos ready
        </button>
      </div>
      {crawlInProgress && activeRunCreatedAt ? (
        <p className="crm-muted">
          Busqueda iniciada el {formatDashboardDateTime(activeRunCreatedAt)}.
        </p>
      ) : null}
      {error ? <p className="crm-error">{error}</p> : null}
    </section>
  );
}
