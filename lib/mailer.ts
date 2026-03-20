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
import { buildProspectOutreachDraft, type OutreachMessageType } from "@/lib/outreach";
import { getProspectScoreCard } from "@/lib/prospect-scoring";
import { normalizeEmail } from "@/lib/normalizers";
import {
  countEmailsSentToday,
  isGoodTimeToSend,
  isScheduledSendDue,
  MAX_PER_DAY,
  MAX_PER_RUN,
  sortProspectsForDelivery,
} from "@/lib/send-scheduler";

const TERMINAL_STATUSES: ProspectStatus[] = ["replied", "closed", "rejected"];
const CONTACTED_STATUSES: ProspectStatus[] = ["contacted", "replied", "closed"];

type FollowupPlan = {
  stage: number;
  type: Extract<OutreachMessageType, "followup_1" | "followup_2" | "followup_3">;
  minDays: number;
  eventType: string;
  label: string;
};

type SendSummary = {
  total: number;
  pending: number;
  dueFollowups: number;
  sent: number;
  followupsSent: number;
  failed: number;
  blocked: number;
  skippedPreviouslySent: number;
};

type SendBudget = {
  remainingRun: number;
  remainingDay: number;
};

const FOLLOWUP_SEQUENCE: FollowupPlan[] = [
  {
    stage: 1,
    type: "followup_1",
    minDays: 3,
    eventType: "followup_1_sent",
    label: "recordatorio suave",
  },
  {
    stage: 2,
    type: "followup_2",
    minDays: 5,
    eventType: "followup_2_sent",
    label: "nuevo angulo",
  },
  {
    stage: 3,
    type: "followup_3",
    minDays: 15,
    eventType: "followup_3_sent",
    label: "cierre elegante",
  },
];

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

function createEmptySendSummary(total = 0): SendSummary {
  return {
    total,
    pending: 0,
    dueFollowups: 0,
    sent: 0,
    followupsSent: 0,
    failed: 0,
    blocked: 0,
    skippedPreviouslySent: 0,
  };
}

function mergeSendSummaries(left: SendSummary, right: SendSummary): SendSummary {
  return {
    total: Math.max(left.total, right.total),
    pending: left.pending + right.pending,
    dueFollowups: left.dueFollowups + right.dueFollowups,
    sent: left.sent + right.sent,
    followupsSent: left.followupsSent + right.followupsSent,
    failed: left.failed + right.failed,
    blocked: left.blocked + right.blocked,
    skippedPreviouslySent: left.skippedPreviouslySent + right.skippedPreviouslySent,
  };
}

async function createSendBudget() {
  const sentToday = await countEmailsSentToday();

  return {
    remainingRun: MAX_PER_RUN,
    remainingDay: Math.max(MAX_PER_DAY - sentToday, 0),
  } satisfies SendBudget;
}

function canSendMore(budget: SendBudget) {
  return budget.remainingRun > 0 && budget.remainingDay > 0;
}

function consumeSendBudget(budget: SendBudget) {
  budget.remainingRun -= 1;
  budget.remainingDay -= 1;
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
  return params.transporter.sendMail({
    from: `"${getFromName()}" <${getFromEmail() || getSmtpUser()}>`,
    to: params.to,
    subject: params.subject,
    text: params.message,
    html: renderPlainTextAsHtml(params.message),
  });
}

function findPreviouslyContacted(record: Prospect, records: Prospect[]) {
  const historicalRecords = records.filter(
    (item) =>
      item.id !== record.id &&
      (item.contacted ||
        CONTACTED_STATUSES.includes(item.status) ||
        TERMINAL_STATUSES.includes(item.status))
  );

  return findDuplicate(record, historicalRecords);
}

function getDueFollowupPlan(record: Prospect) {
  if (record.status !== "contacted" || !record.contacted) {
    return null;
  }

  const plan = FOLLOWUP_SEQUENCE.find((item) => item.stage === record.followupStage);

  if (!plan) {
    return null;
  }

  if (daysSince(record.lastContactedAt) < plan.minDays) {
    return null;
  }

  return plan;
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

async function loadRecords() {
  const prisma = getPrismaClient();

  return prisma.prospect.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });
}

function filterByIds<T extends { id: string }>(records: T[], ids: string[]) {
  const idsSet = new Set(ids);

  if (!idsSet.size) {
    return records;
  }

  return records.filter((record) => idsSet.has(record.id));
}

export async function listDueFollowups(options: { prospectIds?: string[] } = {}) {
  const records = await loadRecords();
  const ids = Array.isArray(options.prospectIds) ? options.prospectIds : [];

  return filterByIds(records, ids)
    .map((record) => {
      const plan = getDueFollowupPlan(record);

      if (!plan) {
        return null;
      }

      const scoring = getProspectScoreCard(record);

      return {
        id: record.id,
        name: record.name,
        email: record.email,
        status: record.status,
        priority: scoring.priority,
        followupStage: record.followupStage,
        followupCount: record.followupCount,
        lastContactedAt: record.lastContactedAt?.toISOString() || null,
        daysSinceLastContact: daysSince(record.lastContactedAt),
        nextType: plan.type,
        minDays: plan.minDays,
        label: plan.label,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function sendInitialProspectEmails(
  options: { prospectIds?: string[] } = {},
  budget?: SendBudget
) {
  const records = await loadRecords();
  const ids = Array.isArray(options.prospectIds) ? options.prospectIds : [];
  const now = new Date();
  const pendingRecords = sortProspectsForDelivery(
    filterByIds(records, ids).filter(
      (record) => record.status === "ready" && isScheduledSendDue(record, now)
    )
  );
  const summary = createEmptySendSummary(records.length);
  const sendBudget = budget || (await createSendBudget());

  summary.pending = pendingRecords.length;

  console.log(`[send:initial] Registros cargados: ${records.length}`);
  console.log(`[send:initial] Prospectos por enviar: ${pendingRecords.length}`);

  if (!pendingRecords.length) {
    return summary;
  }

  const transporter = createTransporter();

  for (const record of pendingRecords) {
    if (!canSendMore(sendBudget)) {
      summary.blocked += 1;

      await updateProspectWithEvent({
        prospectId: record.id,
        status: record.status,
        eventType: "send_rate_limited",
        lastError: "Blocked because MAX_PER_RUN or MAX_PER_DAY was reached",
        metadata: {
          fromStatus: record.status,
          toStatus: record.status,
          note: "Blocked because MAX_PER_RUN or MAX_PER_DAY was reached",
          remainingRun: sendBudget.remainingRun,
          remainingDay: sendBudget.remainingDay,
        } as Prisma.InputJsonObject,
      });

      continue;
    }

    const previousContact = findPreviouslyContacted(record, records);
    const scoring = getProspectScoreCard(record);

    if (record.contacted || previousContact) {
      summary.skippedPreviouslySent += 1;

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
      summary.failed += 1;

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

    if (scoring.priority !== "alto" || !record.message.trim() || record.status !== "ready") {
      summary.blocked += 1;

      await updateProspectWithEvent({
        prospectId: record.id,
        status: record.status,
        eventType: "send_blocked",
        lastError: "Blocked because prospect is not ready for outreach",
        metadata: {
          fromStatus: record.status,
          toStatus: record.status,
          note:
            "Blocked because contacted must be false, status must be ready, priority alto and message must exist",
          priority: scoring.priority,
          contacted: record.contacted,
          hasSubject: Boolean(record.subject.trim()),
          hasMessage: Boolean(record.message.trim()),
        } as Prisma.InputJsonObject,
      });

      continue;
    }

    if (!isGoodTimeToSend(record, now)) {
      summary.blocked += 1;

      await updateProspectWithEvent({
        prospectId: record.id,
        status: record.status,
        eventType: "send_outside_business_hours",
        lastError: "Blocked because current hour is outside recommended business hours",
        metadata: {
          fromStatus: record.status,
          toStatus: record.status,
          note: "Blocked because current hour is outside recommended business hours",
          scheduledSendAt: record.scheduledSendAt?.toISOString() || null,
          currentHour: now.getHours(),
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

      summary.sent += 1;
      consumeSendBudget(sendBudget);

      await updateProspectWithEvent({
        prospectId: record.id,
        status: "contacted",
        eventType: "send_success",
        lastMessageId: info.messageId,
        sentAt,
        data: {
          contacted: true,
          scheduledSendAt: null,
          lastContactedAt: sentAt,
          followupStage: record.followupStage + 1,
        },
        metadata: {
          fromStatus: "ready",
          toStatus: "contacted",
          note: "Outbound email sent",
          messageId: info.messageId,
          followupStage: record.followupStage + 1,
        } as Prisma.InputJsonObject,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email error";
      summary.failed += 1;

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
    }
  }

  return summary;
}

export async function sendDueFollowupEmails(
  options: { prospectIds?: string[] } = {},
  budget?: SendBudget
) {
  const records = await loadRecords();
  const ids = Array.isArray(options.prospectIds) ? options.prospectIds : [];
  const now = new Date();
  const candidates = sortProspectsForDelivery(
    filterByIds(records, ids).filter((record) => {
      const plan = getDueFollowupPlan(record);
      return Boolean(plan && isScheduledSendDue(record, now));
    })
  )
    .map((record) => {
      const plan = getDueFollowupPlan(record);
      return plan ? { record, plan } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const summary = createEmptySendSummary(records.length);
  const sendBudget = budget || (await createSendBudget());

  summary.dueFollowups = candidates.length;

  console.log(`[send:followups] Registros cargados: ${records.length}`);
  console.log(`[send:followups] Followups por enviar: ${candidates.length}`);

  if (!candidates.length) {
    return summary;
  }

  const transporter = createTransporter();

  for (const { record, plan } of candidates) {
    if (!canSendMore(sendBudget)) {
      summary.blocked += 1;

      await updateProspectWithEvent({
        prospectId: record.id,
        status: record.status,
        eventType: "followup_rate_limited",
        lastError: "Blocked because MAX_PER_RUN or MAX_PER_DAY was reached",
        metadata: {
          fromStatus: record.status,
          toStatus: record.status,
          note: "Blocked because MAX_PER_RUN or MAX_PER_DAY was reached",
          remainingRun: sendBudget.remainingRun,
          remainingDay: sendBudget.remainingDay,
          followupStage: record.followupStage,
        } as Prisma.InputJsonObject,
      });

      continue;
    }

    if (!isValidEmail(normalizeEmail(record.email))) {
      summary.failed += 1;

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
          followupStage: record.followupStage,
        } as Prisma.InputJsonObject,
      });

      continue;
    }

    const scoring = getProspectScoreCard(record);

    if (scoring.priority !== "alto") {
      summary.blocked += 1;

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
          followupStage: record.followupStage,
        } as Prisma.InputJsonObject,
      });

      continue;
    }

    if (!isGoodTimeToSend(record, now)) {
      summary.blocked += 1;

      await updateProspectWithEvent({
        prospectId: record.id,
        status: record.status,
        eventType: "followup_outside_business_hours",
        lastError: "Blocked because current hour is outside recommended business hours",
        metadata: {
          fromStatus: record.status,
          toStatus: record.status,
          note: "Blocked because current hour is outside recommended business hours",
          followupStage: record.followupStage,
          scheduledSendAt: record.scheduledSendAt?.toISOString() || null,
          currentHour: now.getHours(),
        } as Prisma.InputJsonObject,
      });

      continue;
    }

    try {
      const draft = buildProspectOutreachDraft(record, plan.type);
      const sentAt = new Date();
      const info = await sendCustomEmailWithTransporter({
        transporter,
        to: record.email,
        subject: draft.subject,
        message: draft.message,
      });

      summary.followupsSent += 1;
      consumeSendBudget(sendBudget);

      await updateProspectWithEvent({
        prospectId: record.id,
        status: "contacted",
        eventType: plan.eventType,
        lastMessageId: info.messageId,
        sentAt,
        data: {
          contacted: true,
          scheduledSendAt: null,
          lastContactedAt: sentAt,
          followupCount: record.followupCount + 1,
          followupStage: record.followupStage + 1,
          subject: draft.subject,
          message: draft.message,
        },
        metadata: {
          fromStatus: record.status,
          toStatus: "contacted",
          note: `Automated ${plan.label} sent`,
          messageId: info.messageId,
          followupCount: record.followupCount + 1,
          followupStage: record.followupStage + 1,
          type: plan.type,
        } as Prisma.InputJsonObject,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown follow-up error";
      summary.failed += 1;

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
          followupStage: record.followupStage,
          type: plan.type,
        } as Prisma.InputJsonObject,
      });
    }
  }

  return summary;
}

export async function sendProspectEmails(options: {
  prospectIds?: string[];
  mode?: "all" | "initial" | "followups";
} = {}) {
  const mode = options.mode || "all";
  const budget = await createSendBudget();

  if (mode === "initial") {
    return sendInitialProspectEmails(options, budget);
  }

  if (mode === "followups") {
    return sendDueFollowupEmails(options, budget);
  }

  const initial = await sendInitialProspectEmails(options, budget);
  const followups = await sendDueFollowupEmails(options, budget);

  return mergeSendSummaries(initial, followups);
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
          scheduledSendAt: null,
          lastContactedAt: sentAt,
          followupStage: prospect.followupStage + 1,
      },
      metadata: {
        fromStatus: prospect.status,
        toStatus: "contacted",
        note: "Outbound email sent from prospect endpoint",
        messageId: info.messageId,
        subject,
        followupStage: prospect.followupStage + 1,
      } as Prisma.InputJsonObject,
    });

    return {
      id: prospect.id,
      email: prospect.email,
      subject,
      messageId: info.messageId,
      status: "contacted" as const,
      followupStage: prospect.followupStage + 1,
      lastContactedAt: sentAt.toISOString(),
    };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Unknown email error";

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
