import type { Prisma, Prospect, ProspectStatus } from "@/generated/prisma";
import nodemailer from "nodemailer";
import { getPrismaClient } from "@/lib/db";
import {
  getFromEmail,
  getFromName,
  getSmtpHost,
  getSmtpPass,
  getSmtpPort,
  getSmtpSecure,
  getSmtpUser,
} from "@/lib/env";
import { findDuplicate } from "@/lib/dedupe";
import { buildEmail, type ProspectEmailModel } from "@/lib/email-template";
import {
  type ManualProspectInput,
  validateManualProspect,
} from "@/lib/manual-prospects";
import { buildProspectOutreachDraft } from "@/lib/outreach";
import { getProspectScoreCard } from "@/lib/prospect-scoring";
import { normalizeEmail } from "@/lib/normalizers";

const TERMINAL_STATUSES: ProspectStatus[] = [
  "replied",
  "closed",
  "rejected",
];

const CONTACTED_STATUSES: ProspectStatus[] = ["contacted", "replied", "closed"];

function isValidEmail(email: string) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateEnv() {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Faltan variables SMTP requeridas: ${missing.join(", ")}.`);
  }
}

function createTransporter() {
  validateEnv();

  return nodemailer.createTransport({
    host: getSmtpHost(),
    port: Number(getSmtpPort()),
    secure: getSmtpSecure(),
    auth: {
      user: getSmtpUser(),
      pass: getSmtpPass(),
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPlainTextAsHtml(message: string) {
  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;">
      <tr>
        <td style="padding:28px;">
          <div style="white-space:pre-wrap;font-size:15px;line-height:1.75;color:#334155;">${escapeHtml(
            message
          )}</div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function daysSince(value: Date | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const diffMs = Date.now() - value.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

async function sendEmailWithTransporter(
  transporter: nodemailer.Transporter,
  record: ProspectEmailModel
) {
  const email = buildEmail(record);
  const info = await transporter.sendMail({
    from: `"${getFromName()}" <${getFromEmail() || getSmtpUser()}>`,
    to: record.email,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  return {
    info,
    email,
  };
}

async function sendCustomEmailWithTransporter(params: {
  transporter: nodemailer.Transporter;
  to: string;
  subject: string;
  message: string;
}) {
  const info = await params.transporter.sendMail({
    from: `"${getFromName()}" <${getFromEmail() || getSmtpUser()}>`,
    to: params.to,
    subject: params.subject,
    text: params.message,
    html: renderPlainTextAsHtml(params.message),
  });

  return info;
}

function findPreviouslyContacted(record: Prospect, records: Prospect[]) {
  const historicalRecords = records.filter(
    (item) =>
      item.id !== record.id &&
      (item.contacted || CONTACTED_STATUSES.includes(item.status) || TERMINAL_STATUSES.includes(item.status))
  );

  return findDuplicate(record, historicalRecords);
}

async function updateProspectWithEvent(params: {
  prospectId: string;
  status: ProspectStatus;
  eventType: string;
  metadata: Prisma.InputJsonObject;
  lastError?: string;
  lastMessageId?: string;
  sentAt?: Date;
  data?: Prisma.ProspectUpdateInput;
}) {
  const prisma = getPrismaClient();
  const timestamp = params.sentAt || new Date();

  await prisma.$transaction(async (tx) => {
    const current = await tx.prospect.findUniqueOrThrow({
      where: { id: params.prospectId },
    });

    await tx.prospect.update({
      where: { id: params.prospectId },
      data: {
        ...(params.data || {}),
        status: params.status,
        lastCheckedAt: timestamp,
        lastError: params.lastError || "",
        lastMessageId: params.lastMessageId || current.lastMessageId,
      },
    });

    await tx.contactEvent.create({
      data: {
        prospectId: params.prospectId,
        eventType: params.eventType,
        metadata: params.metadata,
        createdAt: timestamp,
      },
    });
  });
}

function isDueForFollowup(record: Prospect) {
  if (record.status !== "contacted") {
    return false;
  }

  if (!record.contacted) {
    return false;
  }

  if (record.followupCount >= 2) {
    return false;
  }

  return daysSince(record.lastContactedAt) >= 2;
}

export async function sendProspectEmails(options: { prospectIds?: string[] } = {}) {
  const prisma = getPrismaClient();
  console.log("[send] Iniciando envio...");

  const targetIds = Array.isArray(options.prospectIds) ? options.prospectIds : [];
  const records = await prisma.prospect.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });
  const idsSet = new Set(targetIds);

  const pendingRecords = records.filter((record) => {
    if (record.status !== "ready") {
      return false;
    }

    if (!idsSet.size) {
      return true;
    }

    return idsSet.has(record.id);
  });
  const followupRecords = records.filter((record) => {
    if (!isDueForFollowup(record)) {
      return false;
    }

    if (!idsSet.size) {
      return true;
    }

    return idsSet.has(record.id);
  });

  console.log(`[send] Registros cargados: ${records.length}`);
  console.log(`[send] Prospectos por enviar: ${pendingRecords.length}`);
  console.log(`[send] Followups por enviar: ${followupRecords.length}`);

  if (!pendingRecords.length && !followupRecords.length) {
    return {
      total: records.length,
      pending: 0,
      dueFollowups: 0,
      sent: 0,
      followupsSent: 0,
      failed: 0,
      blocked: 0,
      skippedPreviouslySent: 0,
    };
  }

  const transporter = createTransporter();
  let sentCount = 0;
  let failedCount = 0;
  let skippedPreviouslySentCount = 0;
  let blockedCount = 0;
  let followupsSentCount = 0;

  for (const record of pendingRecords) {
    const previousContact = findPreviouslyContacted(record, records);
    const scoring = getProspectScoreCard(record);

    if (record.contacted || previousContact) {
      skippedPreviouslySentCount += 1;

      await updateProspectWithEvent({
        prospectId: record.id,
        status: record.status,
        eventType: "send_skipped",
        lastError: "Skipped because prospect is already marked as contacted",
        metadata: {
          fromStatus: record.status,
          toStatus: record.status,
          note: `Skipped duplicate by ${
            previousContact ? previousContact.reason : "status"
          }`,
          contacted: record.contacted,
        } as Prisma.InputJsonObject,
      });

      continue;
    }

    if (!isValidEmail(normalizeEmail(record.email))) {
      failedCount += 1;

      await updateProspectWithEvent({
        prospectId: record.id,
        status: record.status,
        eventType: "invalid_email",
        lastError: "Invalid or empty email",
        metadata: {
          fromStatus: record.status,
          toStatus: record.status,
          note: "Skipped because email is invalid or empty",
          error: "Invalid or empty email",
        } as Prisma.InputJsonObject,
      });

      continue;
    }

    if (
      scoring.priority !== "alto" ||
      !record.message.trim() ||
      record.status !== "ready"
    ) {
      blockedCount += 1;

      await updateProspectWithEvent({
        prospectId: record.id,
        status: record.status,
        eventType: "send_blocked",
        lastError: "Blocked because prospect is not ready for outreach",
        metadata: {
          fromStatus: record.status,
          toStatus: record.status,
          note: "Blocked because contacted must be false, status must be ready, priority alto and message must exist",
          priority: scoring.priority,
          contacted: record.contacted,
          hasSubject: Boolean(record.subject.trim()),
          hasMessage: Boolean(record.message.trim()),
        } as Prisma.InputJsonObject,
      });

      continue;
    }

    try {
      const sentAt = new Date();
      const info = await sendCustomEmailWithTransporter({
        transporter,
        to: record.email,
        subject: record.subject.trim(),
        message: record.message.trim(),
      });

      sentCount += 1;

      await updateProspectWithEvent({
        prospectId: record.id,
        status: "contacted",
        eventType: "send_success",
        lastMessageId: info.messageId,
        sentAt,
        data: {
          contacted: true,
          lastContactedAt: sentAt,
        },
        metadata: {
          fromStatus: "ready",
          toStatus: "contacted",
          note: "Outbound email sent",
          messageId: info.messageId,
        } as Prisma.InputJsonObject,
      });

      console.log(`[send] Enviado a ${record.name}: ${info.messageId}`);
    } catch (error) {
      failedCount += 1;
      const message = error instanceof Error ? error.message : "Unknown email error";

      await updateProspectWithEvent({
        prospectId: record.id,
        status: record.status,
        eventType: "send_error",
        lastError: message,
        metadata: {
          fromStatus: record.status,
          toStatus: record.status,
          note: "Outbound email failed",
          error: message,
        } as Prisma.InputJsonObject,
      });

      console.error(`[send] Error con ${record.name}: ${message}`);
    }
  }

  for (const record of followupRecords) {
    if (!isValidEmail(normalizeEmail(record.email))) {
      failedCount += 1;

      await updateProspectWithEvent({
        prospectId: record.id,
        status: record.status,
        eventType: "followup_invalid_email",
        lastError: "Invalid or empty email for follow-up",
        metadata: {
          fromStatus: record.status,
          toStatus: record.status,
          note: "Skipped follow-up because email is invalid or empty",
          error: "Invalid or empty email for follow-up",
        } as Prisma.InputJsonObject,
      });

      continue;
    }

    const scoring = getProspectScoreCard(record);

    if (scoring.priority !== "alto") {
      blockedCount += 1;

      await updateProspectWithEvent({
        prospectId: record.id,
        status: record.status,
        eventType: "followup_skipped",
        lastError: "Skipped follow-up because priority is not alto",
        metadata: {
          fromStatus: record.status,
          toStatus: record.status,
          note: "Skipped follow-up because priority is not alto",
          priority: scoring.priority,
          followupCount: record.followupCount,
        } as Prisma.InputJsonObject,
      });

      continue;
    }

    try {
      const draft = buildProspectOutreachDraft(record, "followup");
      const sentAt = new Date();
      const info = await sendCustomEmailWithTransporter({
        transporter,
        to: record.email,
        subject: draft.subject,
        message: draft.message,
      });

      followupsSentCount += 1;

      await updateProspectWithEvent({
        prospectId: record.id,
        status: "contacted",
        eventType: "followup_sent",
        lastMessageId: info.messageId,
        sentAt,
        data: {
          contacted: true,
          lastContactedAt: sentAt,
          followupCount: record.followupCount + 1,
          subject: draft.subject,
          message: draft.message,
        },
        metadata: {
          fromStatus: record.status,
          toStatus: "contacted",
          note: "Automated follow-up email sent",
          messageId: info.messageId,
          followupCount: record.followupCount + 1,
        } as Prisma.InputJsonObject,
      });
    } catch (error) {
      failedCount += 1;
      const message = error instanceof Error ? error.message : "Unknown follow-up error";

      await updateProspectWithEvent({
        prospectId: record.id,
        status: record.status,
        eventType: "followup_error",
        lastError: message,
        metadata: {
          fromStatus: record.status,
          toStatus: record.status,
          note: "Automated follow-up failed",
          error: message,
          followupCount: record.followupCount,
        } as Prisma.InputJsonObject,
      });
    }
  }

  console.log(`[send] Enviados: ${sentCount}`);
  console.log(`[send] Followups enviados: ${followupsSentCount}`);
  console.log(`[send] Fallidos: ${failedCount}`);
  console.log(`[send] Bloqueados: ${blockedCount}`);
  console.log(`[send] Omitidos por contacto previo: ${skippedPreviouslySentCount}`);

  return {
    total: records.length,
    pending: pendingRecords.length,
    dueFollowups: followupRecords.length,
    sent: sentCount,
    followupsSent: followupsSentCount,
    failed: failedCount,
    blocked: blockedCount,
    skippedPreviouslySent: skippedPreviouslySentCount,
  };
}

export async function sendTestEmail(input: ManualProspectInput = {}) {
  const prepared = validateManualProspect(input, {
    requireEmail: true,
  });

  if (!isValidEmail(normalizeEmail(prepared.email))) {
    throw new Error("El correo de prueba no es valido.");
  }

  const transporter = createTransporter();
  const { info, email } = await sendEmailWithTransporter(transporter, prepared);

  return {
    messageId: info.messageId,
    subject: email.subject,
    to: prepared.email,
  };
}

export async function sendProspectEmailById(input: {
  prospectId: string;
  subject: string;
  message: string;
}) {
  const prisma = getPrismaClient();
  const prospect = await prisma.prospect.findUnique({
    where: { id: input.prospectId },
  });

  if (!prospect) {
    throw new Error("Prospecto no encontrado.");
  }

  if (prospect.contacted) {
    throw new Error("El prospecto ya fue contactado y se omite el envio.");
  }

  if (["replied", "closed", "rejected"].includes(prospect.status)) {
    throw new Error("El prospecto no esta disponible para envio.");
  }

  if (!isValidEmail(normalizeEmail(prospect.email))) {
    throw new Error("El prospecto no tiene un correo valido.");
  }

  const scoring = getProspectScoreCard(prospect);

  if (scoring.priority !== "alto") {
    throw new Error("El prospecto esta bloqueado: la prioridad debe ser alto.");
  }

  if (!prospect.message.trim()) {
    throw new Error("El prospecto esta bloqueado: falta message.");
  }

  if (prospect.status !== "ready") {
    throw new Error("El prospecto esta bloqueado: el estado debe ser ready.");
  }

  const subject = input.subject.trim() || prospect.subject.trim();
  const message = input.message.trim() || prospect.message.trim();

  if (!subject) {
    throw new Error("El asunto es obligatorio.");
  }

  if (!message) {
    throw new Error("El mensaje es obligatorio.");
  }

  const transporter = createTransporter();

  try {
    const sentAt = new Date();
    const info = await sendCustomEmailWithTransporter({
      transporter,
      to: prospect.email,
      subject,
      message,
    });

    await updateProspectWithEvent({
      prospectId: prospect.id,
      status: "contacted",
      eventType: "send_success",
      lastMessageId: info.messageId,
      sentAt,
      data: {
        contacted: true,
        lastContactedAt: sentAt,
      },
      metadata: {
        fromStatus: prospect.status,
        toStatus: "contacted",
        note: "Outbound email sent from prospect endpoint",
        messageId: info.messageId,
        subject,
      } as Prisma.InputJsonObject,
    });

    return {
      id: prospect.id,
      email: prospect.email,
      subject,
      messageId: info.messageId,
      status: "contacted" as const,
    };
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "Unknown email error";

    await updateProspectWithEvent({
      prospectId: prospect.id,
      status: prospect.status,
      eventType: "send_error",
      lastError: messageText,
      metadata: {
        fromStatus: prospect.status,
        toStatus: prospect.status,
        note: "Outbound email failed from prospect endpoint",
        error: messageText,
        subject,
      } as Prisma.InputJsonObject,
    });

    throw error;
  }
}
