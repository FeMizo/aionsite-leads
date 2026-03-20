"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api-client";

const DEFAULT_TEST_PROSPECT = {
  name: "Aion Site",
  contactName: "Felipe",
  city: "Carmen",
  email: "femiss0693@gmail.com",
  phone: "9381238531",
  type: "Websites",
  website: "https://aionsite.com.mx/",
};

type ManualProspectForm = typeof DEFAULT_TEST_PROSPECT;

async function postJson(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getApiErrorMessage(body, "No se pudo completar la accion."));
  }

  return body;
}

export function ManualProspectPanel() {
  const [form, setForm] = useState<ManualProspectForm>(DEFAULT_TEST_PROSPECT);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function updateField(field: keyof ManualProspectForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function run(task: () => Promise<void>) {
    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        await task();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo completar la accion."
        );
      }
    });
  }

  function saveProspect() {
    run(async () => {
      const payload = await postJson("/api/prospects", {
        action: "createManual",
        prospect: form,
      });

      setSuccess(
        payload.result?.name
          ? `Prospecto guardado en la cola activa: ${payload.result.name}.`
          : "Prospecto guardado en la cola activa."
      );
      router.refresh();
    });
  }

  function sendTest() {
    run(async () => {
      const payload = await postJson("/api/send", {
        mode: "test",
        prospect: form,
      });

      setSuccess(
        payload.result?.to
          ? `Prueba enviada a ${payload.result.to}.`
          : "Prueba enviada correctamente."
      );
    });
  }

  return (
    <section className="panel panel--accent">
      <div className="panel__header">
        <div>
          <h2>Prospecto manual y prueba SMTP</h2>
          <p>
            Captura un prospecto manualmente o usa este mismo formulario para enviar una prueba a tu correo.
          </p>
        </div>
      </div>

      <div className="crm-form-grid">
        <label className="crm-field">
          <span>Empresa</span>
          <input
            className="crm-input"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Nombre del negocio"
          />
        </label>
        <label className="crm-field">
          <span>Nombre</span>
          <input
            className="crm-input"
            value={form.contactName}
            onChange={(event) => updateField("contactName", event.target.value)}
            placeholder="Contacto principal"
          />
        </label>
        <label className="crm-field">
          <span>Correo</span>
          <input
            className="crm-input"
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="correo@empresa.com"
          />
        </label>
        <label className="crm-field">
          <span>Telefono</span>
          <input
            className="crm-input"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="Telefono"
          />
        </label>
        <label className="crm-field">
          <span>Tipo de empresa</span>
          <input
            className="crm-input"
            value={form.type}
            onChange={(event) => updateField("type", event.target.value)}
            placeholder="Categoria"
          />
        </label>
        <label className="crm-field">
          <span>Ciudad</span>
          <input
            className="crm-input"
            value={form.city}
            onChange={(event) => updateField("city", event.target.value)}
            placeholder="Ciudad"
          />
        </label>
        <label className="crm-field crm-field--full">
          <span>Website</span>
          <input
            className="crm-input"
            value={form.website}
            onChange={(event) => updateField("website", event.target.value)}
            placeholder="https://empresa.com"
          />
        </label>
      </div>

      <div className="panel__actions">
        <button
          type="button"
          className="crm-button crm-button--primary"
          onClick={saveProspect}
          disabled={isPending}
        >
          {isPending ? "Procesando..." : "Guardar prospecto"}
        </button>
        <button
          type="button"
          className="crm-button crm-button--secondary"
          onClick={sendTest}
          disabled={isPending}
        >
          {isPending ? "Procesando..." : "Enviar prueba"}
        </button>
      </div>

      <p className="crm-muted">
        La prueba usa los datos actuales del formulario y no crea un registro en la base.
      </p>
      {success ? <p className="crm-success">{success}</p> : null}
      {error ? <p className="crm-error">{error}</p> : null}
    </section>
  );
}
