require("dotenv").config();

const nodemailer = require("nodemailer");
const { buildEmail } = require("../templates/outreachEmail");
const {
  loadCrmState,
  saveProspects,
  saveContactedProspects,
  saveSentLog,
  syncContactedProspects,
  upsertContactedProspect,
  appendSentLogEntry,
} = require("../utils/storage");

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

async function sendEmails() {
  console.log("[sendEmails] Iniciando envio...");

  const state = loadCrmState();
  const prospects = state.prospects.map((prospect) => ({ ...prospect }));
  let contactedProspects = syncContactedProspects(
    state.contactedProspects,
    prospects
  );
  let sentLog = [...state.sentLog];

  const pendingProspects = prospects.filter(
    (prospect) => (prospect.status || "pending") === "pending"
  );

  console.log(`Prospectos cargados: ${prospects.length}`);
  console.log(`Pendientes por enviar: ${pendingProspects.length}`);

  if (!pendingProspects.length) {
    saveContactedProspects(contactedProspects);
    console.log("[sendEmails] No hay prospectos pendientes.");
    return {
      total: prospects.length,
      pending: 0,
      sent: 0,
      failed: 0,
    };
  }

  const transporter = createTransporter();
  let sentCount = 0;
  let failedCount = 0;

  for (const prospect of prospects) {
    if ((prospect.status || "pending") !== "pending") {
      continue;
    }

    if (!isValidEmail(prospect.email)) {
      const failedAt = new Date().toISOString();
      failedCount += 1;
      prospect.lastCheckedAt = failedAt;
      prospect.lastSendError = "Invalid or empty email";

      sentLog = appendSentLogEntry(sentLog, prospect, {
        status: "invalid_email",
        at: failedAt,
        error: "Invalid or empty email",
      });

      contactedProspects = upsertContactedProspect(contactedProspects, prospect, {
        status: prospect.status || "pending",
        at: failedAt,
        note: "Skipped because email is invalid or empty",
      }).list;

      console.log(`Saltando ${prospect.name}: email invalido o vacio`);
      continue;
    }

    const email = buildEmail(prospect);

    try {
      const info = await transporter.sendMail({
        from: `"${process.env.FROM_NAME || "Aionsite"}" <${
          process.env.FROM_EMAIL || process.env.SMTP_USER
        }>`,
        to: prospect.email,
        subject: email.subject,
        text: email.text,
      });

      const sentAt = new Date().toISOString();
      sentCount += 1;

      prospect.status = "sent";
      prospect.sentAt = sentAt;
      prospect.lastCheckedAt = sentAt;
      prospect.lastSendError = "";
      prospect.lastMessageId = info.messageId;

      sentLog = appendSentLogEntry(sentLog, prospect, {
        status: "sent",
        at: sentAt,
        messageId: info.messageId,
      });

      contactedProspects = upsertContactedProspect(contactedProspects, prospect, {
        status: "sent",
        at: sentAt,
        note: "Outbound email sent",
        meta: {
          messageId: info.messageId,
        },
      }).list;

      console.log(`Enviado a ${prospect.name}: ${info.messageId}`);
    } catch (error) {
      const failedAt = new Date().toISOString();
      failedCount += 1;
      prospect.lastCheckedAt = failedAt;
      prospect.lastSendError = error.message;

      sentLog = appendSentLogEntry(sentLog, prospect, {
        status: "send_error",
        at: failedAt,
        error: error.message,
      });

      contactedProspects = upsertContactedProspect(contactedProspects, prospect, {
        status: prospect.status || "pending",
        at: failedAt,
        note: `Send failed: ${error.message}`,
      }).list;

      console.error(`Error con ${prospect.name}: ${error.message}`);
    }
  }

  saveProspects(prospects);
  saveContactedProspects(contactedProspects);
  saveSentLog(sentLog);

  console.log(`[sendEmails] Enviados: ${sentCount}`);
  console.log(`[sendEmails] Fallidos: ${failedCount}`);

  return {
    total: prospects.length,
    pending: pendingProspects.length,
    sent: sentCount,
    failed: failedCount,
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
