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
import { normalizeEmail } from "@/lib/normalizers";

const TERMINAL_STATUSES: ProspectStatus[] = [
  "contacted",
  "replied",
  "closed",
  "archived",
  "deleted",
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
    (item) => item.id !== record.id && TERMINAL_STATUSES.includes(item.status)
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
    if (record.status !== "prospect") {
      return false;
    }

    if (!idsSet.size) {
      return true;
    }

    return idsSet.has(record.id);
  });

  console.log(`[send] Registros cargados: ${records.length}`);
  console.log(`[send] Prospectos por enviar: ${pendingRecords.length}`);

  if (!pendingRecords.length) {
    return {
      total: records.length,
      pending: 0,
      sent: 0,
      failed: 0,
      skippedPreviouslySent: 0,
    };
  }

  const transporter = createTransporter();
  let sentCount = 0;
  let failedCount = 0;
  let skippedPreviouslySentCount = 0;

  for (const record of pendingRecords) {
    const previousContact = findPreviouslyContacted(record, records);

    if (previousContact || CONTACTED_STATUSES.includes(record.status)) {
      skippedPreviouslySentCount += 1;

      await updateProspectWithEvent({
        prospectId: record.id,
        status: "closed",
        eventType: "duplicate_skip",
        lastError: "Skipped because it was already contacted previously",
        metadata: {
          fromStatus: "prospect",
          toStatus: "closed",
          note: `Skipped duplicate by ${
            previousContact ? previousContact.reason : "status"
          }`,
          error: "Skipped because it was already contacted previously",
        } as Prisma.InputJsonObject,
      });

      continue;
    }

    if (!isValidEmail(normalizeEmail(record.email))) {
      failedCount += 1;

      await updateProspectWithEvent({
        prospectId: record.id,
        status: "failed",
        eventType: "invalid_email",
        lastError: "Invalid or empty email",
        metadata: {
          fromStatus: "prospect",
          toStatus: "failed",
          note: "Skipped because email is invalid or empty",
          error: "Invalid or empty email",
        } as Prisma.InputJsonObject,
      });

      continue;
    }

    try {
      const { info } = await sendEmailWithTransporter(transporter, record);

      sentCount += 1;

      await updateProspectWithEvent({
        prospectId: record.id,
        status: "contacted",
        eventType: "send_success",
        lastMessageId: info.messageId,
        metadata: {
          fromStatus: "prospect",
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
        status: "failed",
        eventType: "send_error",
        lastError: message,
        metadata: {
          fromStatus: "prospect",
          toStatus: "failed",
          note: "Outbound email failed",
          error: message,
        } as Prisma.InputJsonObject,
      });

      console.error(`[send] Error con ${record.name}: ${message}`);
    }
  }

  console.log(`[send] Enviados: ${sentCount}`);
  console.log(`[send] Fallidos: ${failedCount}`);
  console.log(`[send] Omitidos por contacto previo: ${skippedPreviouslySentCount}`);

  return {
    total: records.length,
    pending: pendingRecords.length,
    sent: sentCount,
    failed: failedCount,
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

  if (["deleted", "archived", "closed"].includes(prospect.status)) {
    throw new Error("El prospecto no esta disponible para envio.");
  }

  if (!isValidEmail(normalizeEmail(prospect.email))) {
    throw new Error("El prospecto no tiene un correo valido.");
  }

  const subject = input.subject.trim();
  const message = input.message.trim();

  if (!subject) {
    throw new Error("El asunto es obligatorio.");
  }

  if (!message) {
    throw new Error("El mensaje es obligatorio.");
  }

  const transporter = createTransporter();

  try {
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
      status: "failed",
      eventType: "send_error",
      lastError: messageText,
      metadata: {
        fromStatus: prospect.status,
        toStatus: "failed",
        note: "Outbound email failed from prospect endpoint",
        error: messageText,
        subject,
      } as Prisma.InputJsonObject,
    });

    throw error;
  }
}
