import type { Prisma, Prospect, ProspectStatus } from "@/generated/prisma";
import nodemailer from "nodemailer";
import { getPrismaClient } from "@/lib/db";
import { findDuplicate } from "@/lib/dedupe";
import { buildEmail } from "@/lib/email-template";
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
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
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

    const email = buildEmail(record);

    try {
      const info = await transporter.sendMail({
        from: `"${process.env.FROM_NAME || "Aionsite"}" <${
          process.env.FROM_EMAIL || process.env.SMTP_USER
        }>`,
        to: record.email,
        subject: email.subject,
        text: email.text,
      });

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
