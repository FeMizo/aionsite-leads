"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
    throw new Error(body.error || "No se pudo completar la accion.");
  }
}

type DashboardActionsProps = {
  generatedCount: number;
};

export function DashboardActions({ generatedCount }: DashboardActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

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
          <p>Lanza una corrida manual, aprueba prospectos generados o envia correos.</p>
        </div>
      </div>
      <div className="panel__actions">
        <button
          type="button"
          className="crm-button crm-button--primary"
          onClick={() => run(() => postJson("/api/cron"))}
          disabled={isPending}
        >
          Ejecutar corrida
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
          Aprobar generated
        </button>
        <button
          type="button"
          className="crm-button crm-button--secondary"
          onClick={() => run(() => postJson("/api/send", {}))}
          disabled={isPending}
        >
          Enviar prospectos activos
        </button>
      </div>
      {error ? <p className="crm-error">{error}</p> : null}
    </section>
  );
}
