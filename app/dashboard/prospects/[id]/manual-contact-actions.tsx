"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ManualContactActionsProps = {
  prospectId: string;
  email?: string;
  phone?: string;
  subject: string;
  message: string;
  name: string;
};

function normalizeWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length === 10) {
    return `52${digits}`;
  }

  return digits;
}

function buildMailtoUrl(email: string, subject: string, message: string) {
  const params = new URLSearchParams({
    subject,
    body: message,
  });

  return `mailto:${email}?${params.toString()}`;
}

function buildWhatsAppUrl(phone: string, name: string) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);

  if (!normalizedPhone) {
    return "";
  }

  const shortMessage = `Hola, soy Felipe, desarrollador web en AionSite. Estuve viendo ${name} y creo que hay una oportunidad para conseguir mas clientes desde Google. Te puedo mandar una propuesta?`;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(shortMessage)}`;
}

async function markAsContacted(prospectId: string) {
  const response = await fetch("/api/prospects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "markContacted",
      ids: [prospectId],
    }),
  });

  if (!response.ok) {
    let message = "No se pudo marcar como contactado.";

    try {
      const payload = await response.json();
      if (payload?.error?.message) {
        message = payload.error.message;
      }
    } catch {
      // ignore
    }

    throw new Error(message);
  }
}

async function openLinkAndMarkContacted(
  prospectId: string,
  href: string
) {
  await markAsContacted(prospectId);
  window.location.href = href;
}

function openWhatsAppInNewWindow(href: string) {
  const popup = window.open("about:blank", "_blank");

  if (!popup) {
    throw new Error("No se pudo abrir WhatsApp en una nueva ventana.");
  }

  popup.location.assign(href);
  popup.focus();
}

export function ManualContactActions({
  prospectId,
  email,
  phone,
  subject,
  message,
  name,
}: ManualContactActionsProps) {
  const [busy, setBusy] = useState<"whatsapp" | "email" | null>(null);
  const whatsappUrl = phone ? buildWhatsAppUrl(phone, name) : "";
  const mailtoUrl = email ? buildMailtoUrl(email, subject, message) : "";

  async function handleAction(kind: "whatsapp" | "email") {
    const href = kind === "whatsapp" ? whatsappUrl : mailtoUrl;

    if (!href) {
      return;
    }

    setBusy(kind);

    try {
      if (kind === "whatsapp") {
        openWhatsAppInNewWindow(href);
        return;
      }

      await openLinkAndMarkContacted(prospectId, href);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="manual-contact-actions">
      {whatsappUrl ? (
        <button
          type="button"
          className="crm-button crm-button--primary"
          onClick={(event) => {
            event.preventDefault();
            void handleAction("whatsapp");
          }}
        >
          {busy === "whatsapp" ? "Abriendo WhatsApp..." : `WhatsApp a ${name}`}
        </button>
      ) : null}

      {mailtoUrl ? (
        <a
          href={mailtoUrl}
          className="crm-button crm-button--secondary"
          onClick={(event) => {
            event.preventDefault();
            void handleAction("email");
          }}
        >
          {busy === "email" ? "Abriendo correo..." : `Email a ${name}`}
        </a>
      ) : null}
    </div>
  );
}
