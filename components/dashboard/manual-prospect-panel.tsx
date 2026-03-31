"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api-client";
import { LEAD_TYPES } from "@/lib/lead-types";

const DEFAULT_TEST_PROSPECT = {
  name: "Aion Site",
  contactName: "Felipe",
  city: "Carmen",
  email: "femiss0693@gmail.com",
  phone: "9381238531",
  type: LEAD_TYPES[0],
  website: "https://aionsite.com.mx/",
};

type ManualProspectForm = typeof DEFAULT_TEST_PROSPECT;
type ManualProspectMode = "manual" | "smtp";

const MODE_COPY: Record<
  ManualProspectMode,
  {
    title: string;
    description: string;
    actionLabel: string;
    helperText: string;
  }
> = {
  manual: {
    title: "Prospecto manual",
    description: "Captura un prospecto manualmente y agregalo a la cola activa del CRM.",
    actionLabel: "Guardar prospecto",
    helperText: "Este flujo crea un registro en la base y lo deja disponible para el pipeline.",
  },
  smtp: {
    title: "Prueba SMTP",
    description: "Usa los datos actuales del formulario para enviar una prueba SMTP a tu correo.",
    actionLabel: "Enviar prueba",
    helperText: "La prueba no crea un registro en la base; solo valida el envio con el payload actual.",
  },
};

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
  const [mode, setMode] = useState<ManualProspectMode>("manual");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const activeModeCopy = MODE_COPY[mode];

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

  function switchMode(nextMode: ManualProspectMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
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
          <p>Cambia entre ambos flujos sin salir de esta pantalla.</p>
        </div>
        <button
          type="button"
          className="crm-button crm-button--secondary"
          onClick={() => setIsCollapsed((current) => !current)}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? "Expandir" : "Colapsar"}
        </button>
      </div>

      {isCollapsed ? (
        <p className="crm-muted">
          {activeModeCopy.title}: {activeModeCopy.description}
        </p>
      ) : (
        <>
          <div className="crm-tabs" aria-label="Flujo manual o SMTP">
            <button
              type="button"
              className={mode === "manual" ? "crm-tab is-active" : "crm-tab"}
              onClick={() => switchMode("manual")}
            >
              <span>Prospecto manual</span>
            </button>
            <button
              type="button"
              className={mode === "smtp" ? "crm-tab is-active" : "crm-tab"}
              onClick={() => switchMode("smtp")}
            >
              <span>Prueba SMTP</span>
            </button>
          </div>

          <p className="crm-muted">{activeModeCopy.description}</p>

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
              <span>Tipo de lead</span>
              <select
                className="crm-input"
                value={form.type}
                onChange={(event) => updateField("type", event.target.value)}
              >
                {LEAD_TYPES.map((leadType) => (
                  <option key={leadType} value={leadType}>
                    {leadType}
                  </option>
                ))}
              </select>
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
              onClick={mode === "manual" ? saveProspect : sendTest}
              disabled={isPending}
            >
              {isPending ? "Procesando..." : activeModeCopy.actionLabel}
            </button>
          </div>

          <p className="crm-muted">{activeModeCopy.helperText}</p>
        </>
      )}
      {success ? <p className="crm-success">{success}</p> : null}
      {error ? <p className="crm-error">{error}</p> : null}
    </section>
  );
}
