"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api-client";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
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
    <Banner
      title="Acciones operativas"
      description="Lanza una busqueda manual, aprueba prospectos analizados o envia correos listos."
      actions={
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
      }
    >
      <div className="panel__actions">
        <Button
          type="button"
          variant="primary"
          onClick={() => run(() => postJson("/api/cron"))}
          disabled={isCrawlActive}
        >
          {isCrawlActive ? "Ejecutando crawl..." : "Ejecutar busqueda"}
        </Button>
        <Button
          type="button"
          variant="secondary"
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
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => run(() => postJson("/api/send", {}))}
          disabled={isPending}
        >
          Enviar prospectos ready
        </Button>
      </div>
      {crawlInProgress && activeRunCreatedAt ? (
        <p className="crm-muted">
          Busqueda iniciada el {formatDashboardDateTime(activeRunCreatedAt)}.
        </p>
      ) : null}
      {error ? <p className="crm-error">{error}</p> : null}
    </Banner>
  );
}
