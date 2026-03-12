"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

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

export function QuickActions() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  function run(action: string) {
    setError("");

    startTransition(async () => {
      try {
        await postAction(action);
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
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Acciones principales</h2>
          <p>Genera nuevos datos y dispara envios sobre prospectos activos.</p>
        </div>
      </div>
      <div className="panel__actions">
        <button
          type="button"
          className="crm-button crm-button--primary"
          onClick={() => run("generate")}
          disabled={isPending}
        >
          Generar nuevos datos
        </button>
        <button
          type="button"
          className="crm-button crm-button--secondary"
          onClick={() => run("sendAllProspects")}
          disabled={isPending}
        >
          Enviar correos a prospectos
        </button>
      </div>
      {error ? <p className="crm-error">{error}</p> : null}
    </section>
  );
}
