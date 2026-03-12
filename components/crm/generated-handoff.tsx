"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type GeneratedHandoffProps = {
  generatedCount: number;
};

async function postAction(action: string) {
  const response = await fetch("/api/crm/actions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ids: [] }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "No se pudo completar la accion.");
  }
}

export function GeneratedHandoff({ generatedCount }: GeneratedHandoffProps) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!generatedCount) {
    return null;
  }

  function moveAllGenerated() {
    setError("");

    startTransition(async () => {
      try {
        await postAction("approveAllGenerated");
        router.refresh();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo mover los registros generados."
        );
      }
    });
  }

  return (
    <section className="panel panel--accent">
      <div className="panel__header">
        <div>
          <h2>Prospectos pendientes por aprobar</h2>
          <p>
            Hay {generatedCount} registros en <strong>Generated</strong>. Mientras no
            se aprueben, no aparecen en esta lista.
          </p>
        </div>
      </div>
      <div className="panel__actions">
        <button
          type="button"
          className="crm-button crm-button--primary"
          onClick={moveAllGenerated}
          disabled={isPending}
        >
          Mover todos a Prospectos
        </button>
      </div>
      {error ? <p className="crm-error">{error}</p> : null}
    </section>
  );
}
