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

function buildWhatsAppUrl(phone: string, message: string) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);

  if (!normalizedPhone) {
    return "";
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
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

export function ManualContactActions({
  prospectId,
  email,
  phone,
  subject,
  message,
  name,
}: ManualContactActionsProps) {
  const [busy, setBusy] = useState<"whatsapp" | "email" | null>(null);
  const whatsappUrl = phone ? buildWhatsAppUrl(phone, message) : "";
  const mailtoUrl = email ? buildMailtoUrl(email, subject, message) : "";

  async function handleAction(kind: "whatsapp" | "email") {
    const href = kind === "whatsapp" ? whatsappUrl : mailtoUrl;

    if (!href) {
      return;
    }

    setBusy(kind);

    try {
      await openLinkAndMarkContacted(prospectId, href);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="manual-contact-actions">
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          className="crm-button crm-button--primary"
          onClick={(event) => {
            event.preventDefault();
            void handleAction("whatsapp");
          }}
        >
          {busy === "whatsapp" ? "Abriendo WhatsApp..." : `WhatsApp a ${name}`}
        </a>
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
