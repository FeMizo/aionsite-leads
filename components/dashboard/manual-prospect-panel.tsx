"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api-client";
import { LEAD_TYPES } from "@/lib/lead-types";
import { getProspectStatusLabel } from "@/lib/prospect-status";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";

const DEFAULT_TEST_PROSPECT = {
  name: "Aion Site",
  contactName: "Felipe",
  city: "Carmen",
  email: "femiss0693@gmail.com",
  phone: "9381238531",
  type: LEAD_TYPES[0],
  website: "https://aionsite.com.mx/",
  rating: "",
  businessStatus: "OPERATIONAL",
};

type ManualProspectForm = typeof DEFAULT_TEST_PROSPECT;
type ManualProspectMode = "manual" | "smtp";

type ManualProspectDraftResult = {
  subject: string;
  message: string;
  analysis: string;
  opportunity: string;
  scriptVariant: string | null;
};

type ManualProspectItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  type: string;
  website: string;
  rating: string;
  businessStatus: string;
  score: number;
  priority: "alto" | "medio" | "bajo";
  status: string;
  subject: string;
  message: string;
  opportunity: string;
  recommendedSite: string;
  pitchAngle: string;
};

type ManualProspectCreationResult = {
  item: ManualProspectItem;
  draft: ManualProspectDraftResult | null;
};

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
    helperText: "Este flujo crea el registro, calcula score y genera borrador si hay correo.",
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

function buildMailtoUrl(email: string, subject: string, message: string) {
  const params = new URLSearchParams({
    subject,
    body: message,
  });

  return `mailto:${email}?${params.toString()}`;
}

function buildWhatsAppUrl(phone: string, businessName: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  const normalizedPhone = digits.length === 10 ? `52${digits}` : digits;
  const message = `Hola, soy Felipe, desarrollador web en AionSite. Estuve viendo ${businessName} y creo que hay una oportunidad para conseguir mas clientes desde Google. Te puedo mandar una propuesta?`;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export function ManualProspectPanel() {
  const [form, setForm] = useState<ManualProspectForm>(DEFAULT_TEST_PROSPECT);
  const [mode, setMode] = useState<ManualProspectMode>("manual");
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdResult, setCreatedResult] = useState<ManualProspectCreationResult | null>(null);
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
    setCreatedResult(null);
  }

  function saveProspect() {
    run(async () => {
      const payload = await postJson("/api/prospects", {
        action: "createManual",
        prospect: form,
      });

      const result = payload.result as ManualProspectCreationResult | undefined;
      setCreatedResult(result ?? null);
      setSuccess(
        result?.item?.name
          ? `Prospecto guardado y enriquecido: ${result.item.name}.`
          : "Prospecto guardado y enriquecido."
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

  const previewMessage = createdResult?.draft?.message || createdResult?.item.message || "";
  const previewSubject = createdResult?.draft?.subject || createdResult?.item.subject || "";
  const whatsappUrl =
    createdResult?.item.phone ? buildWhatsAppUrl(createdResult.item.phone, createdResult.item.name) : "";
  const mailtoUrl =
    createdResult?.item.email && previewSubject
      ? buildMailtoUrl(createdResult.item.email, previewSubject, previewMessage)
      : "";

  return (
    <Banner
      title="Prospecto manual y prueba SMTP"
      description="Cambia entre ambos flujos sin salir de esta pantalla."
      actions={
        <Button
          type="button"
          variant="secondary"
          onClick={() => setIsCollapsed((current) => !current)}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? "Expandir" : "Colapsar"}
        </Button>
      }
    >
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
            <label className="crm-field">
              <span>Website</span>
              <input
                className="crm-input"
                value={form.website}
                onChange={(event) => updateField("website", event.target.value)}
                placeholder="https://empresa.com"
              />
            </label>
            <label className="crm-field">
              <span>Rating</span>
              <input
                className="crm-input"
                value={form.rating}
                onChange={(event) => updateField("rating", event.target.value)}
                placeholder="4.6"
              />
            </label>
            <label className="crm-field">
              <span>Estado del negocio</span>
              <input
                className="crm-input"
                value={form.businessStatus}
                onChange={(event) => updateField("businessStatus", event.target.value)}
                placeholder="OPERATIONAL"
              />
            </label>
          </div>

          <div className="panel__actions">
            <Button
              type="button"
              variant="primary"
              onClick={mode === "manual" ? saveProspect : sendTest}
              disabled={isPending}
            >
              {isPending ? "Procesando..." : activeModeCopy.actionLabel}
            </Button>
          </div>

          <p className="crm-muted">{activeModeCopy.helperText}</p>
        </>
      )}

      {createdResult ? (
        <div className="panel" style={{ marginTop: "1rem" }}>
          <div className="panel__header">
            <div>
              <h2>Prospecto generado</h2>
              <p>
                Score {createdResult.item.score} · prioridad {createdResult.item.priority} ·{" "}
                {getProspectStatusLabel(createdResult.item.status)}
              </p>
            </div>
          </div>

          <dl className="detail-dl">
            <dt>Oportunidad</dt>
            <dd>{createdResult.item.opportunity || "—"}</dd>
            <dt>Angulo</dt>
            <dd>{createdResult.item.pitchAngle || "—"}</dd>
            <dt>Recomendado</dt>
            <dd>{createdResult.item.recommendedSite || "—"}</dd>
            <dt>Canales</dt>
            <dd>
              {createdResult.item.email ? "Correo habilitado" : "Sin correo"} ·{" "}
              {createdResult.item.phone ? "WhatsApp habilitado" : "Sin WhatsApp"}
            </dd>
          </dl>

          {mailtoUrl || whatsappUrl ? (
            <div className="panel__actions">
              {mailtoUrl ? (
                <a
                  className="crm-button crm-button--secondary"
                  href={mailtoUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Abrir correo
                </a>
              ) : null}
              {whatsappUrl ? (
                <a
                  className="crm-button crm-button--primary"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Abrir WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}

          {createdResult.draft ? (
            <pre className="detail-stored-message" style={{ whiteSpace: "pre-wrap" }}>
              {`${createdResult.draft.subject}\n\n${createdResult.draft.message}`}
            </pre>
          ) : (
            <p className="crm-muted">
              Agrega correo para generar el borrador automaticamente.
            </p>
          )}
        </div>
      ) : null}

      {success ? <p className="crm-success">{success}</p> : null}
      {error ? <p className="crm-error">{error}</p> : null}
    </Banner>
  );
}
