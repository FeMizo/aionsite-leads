require("dotenv").config();

const nodemailer = require("nodemailer");
const { buildEmail } = require("../templates/outreachEmail");
const { isDuplicateProspect } = require("../utils/dedupe");
const {
  buildHistoryEntry,
  CONTACTED_STATUSES,
  loadCrmState,
  saveCrmState,
  TERMINAL_STATUSES,
} = require("../utils/crm");

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateEnv() {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(
      `Faltan variables SMTP requeridas: ${missing.join(", ")}.`
    );
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

function findPreviouslyContacted(record, records) {
  const historicalRecords = records.filter(
    (item) => item.id !== record.id && TERMINAL_STATUSES.includes(item.status)
  );

  return isDuplicateProspect(record, historicalRecords, [], []);
}

async function sendEmails(options = {}) {
  console.log("[sendEmails] Iniciando envio...");

  const targetIds = Array.isArray(options.recordIds) ? options.recordIds : [];
  const state = loadCrmState();
  const records = state.records.map((record) => ({ ...record }));
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

  console.log(`Registros CRM cargados: ${records.length}`);
  console.log(`Prospectos por enviar: ${pendingRecords.length}`);

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
  const history = [...state.history];
  let sentCount = 0;
  let failedCount = 0;
  let skippedPreviouslySentCount = 0;

  for (const record of pendingRecords) {
    const previousContact = findPreviouslyContacted(record, records);

    if (previousContact || CONTACTED_STATUSES.includes(record.status)) {
      const skippedAt = new Date().toISOString();
      skippedPreviouslySentCount += 1;
      record.status = "closed";
      record.updatedAt = skippedAt;
      record.lastError = "Skipped because it was already contacted previously";

      history.push(
        buildHistoryEntry(record, "duplicate_skip", {
          fromStatus: "prospect",
          toStatus: "closed",
          at: skippedAt,
          note: `Skipped duplicate by ${previousContact ? previousContact.reason : "status"}`,
          error: record.lastError,
          meta: {
            source: record.source,
            city: record.city,
            email: record.email,
            phone: record.phone,
            category: record.category,
            createdAt: record.createdAt,
          },
        })
      );

      console.log(
        `Saltando ${record.businessName}: ya existe contacto previo${previousContact ? ` por ${previousContact.reason}` : ""}`
      );
      continue;
    }

    if (!isValidEmail(record.email)) {
      const failedAt = new Date().toISOString();
      failedCount += 1;
      record.status = "failed";
      record.updatedAt = failedAt;
      record.lastError = "Invalid or empty email";

      history.push(
        buildHistoryEntry(record, "invalid_email", {
          fromStatus: "prospect",
          toStatus: "failed",
          at: failedAt,
          error: record.lastError,
          note: "Skipped because email is invalid or empty",
          meta: {
            source: record.source,
            city: record.city,
            email: record.email,
            phone: record.phone,
            category: record.category,
            createdAt: record.createdAt,
          },
        })
      );

      console.log(`Saltando ${record.businessName}: email invalido o vacio`);
      continue;
    }

    const email = buildEmail({
      ...record,
      name: record.businessName || record.name,
      type: record.category || record.type,
    });

    try {
      const info = await transporter.sendMail({
        from: `"${process.env.FROM_NAME || "Aionsite"}" <${
          process.env.FROM_EMAIL || process.env.SMTP_USER
        }>`,
        to: record.email,
        subject: email.subject,
        text: email.text,
      });

      const sentAt = new Date().toISOString();
      sentCount += 1;
      record.status = "contacted";
      record.sentAt = sentAt;
      record.updatedAt = sentAt;
      record.lastError = "";
      record.lastMessageId = info.messageId;

      history.push(
        buildHistoryEntry(record, "send_success", {
          fromStatus: "prospect",
          toStatus: "contacted",
          at: sentAt,
          note: "Outbound email sent",
          meta: {
            source: record.source,
            city: record.city,
            email: record.email,
            phone: record.phone,
            category: record.category,
            createdAt: record.createdAt,
            messageId: info.messageId,
          },
        })
      );

      console.log(`Enviado a ${record.businessName}: ${info.messageId}`);
    } catch (error) {
      const failedAt = new Date().toISOString();
      failedCount += 1;
      record.status = "failed";
      record.updatedAt = failedAt;
      record.lastError = error.message;

      history.push(
        buildHistoryEntry(record, "send_error", {
          fromStatus: "prospect",
          toStatus: "failed",
          at: failedAt,
          error: error.message,
          note: "Outbound email failed",
          meta: {
            source: record.source,
            city: record.city,
            email: record.email,
            phone: record.phone,
            category: record.category,
            createdAt: record.createdAt,
          },
        })
      );

      console.error(`Error con ${record.businessName}: ${error.message}`);
    }
  }

  saveCrmState(records, history);

  console.log(`[sendEmails] Enviados: ${sentCount}`);
  console.log(`[sendEmails] Fallidos: ${failedCount}`);
  console.log(
    `[sendEmails] Omitidos por contacto previo: ${skippedPreviouslySentCount}`
  );

  return {
    total: records.length,
    pending: pendingRecords.length,
    sent: sentCount,
    failed: failedCount,
    skippedPreviouslySent: skippedPreviouslySentCount,
  };
}

if (require.main === module) {
  sendEmails().catch((error) => {
    console.error(`[sendEmails] Error: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  sendEmails,
};
