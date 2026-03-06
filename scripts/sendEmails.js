require("dotenv").config();
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const { buildEmail } = require("../templates/outreachEmail");

const prospectsPath = path.join(__dirname, "../data/prospects.json");
const prospects = JSON.parse(fs.readFileSync(prospectsPath, "utf8"));

const transporter = nodemailer.createTransport({
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

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendEmails() {
  console.log(`Prospectos cargados: ${prospects.length}`);

  for (const prospect of prospects) {
    if (!isValidEmail(prospect.email)) {
      console.log(`Saltando ${prospect.name}: email inválido o vacío`);
      continue;
    }

    const email = buildEmail(prospect);

    try {
      const info = await transporter.sendMail({
        from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
        to: prospect.email,
        subject: email.subject,
        text: email.text,
      });

      console.log(`Enviado a ${prospect.name}: ${info.messageId}`);
    } catch (error) {
      console.error(`Error con ${prospect.name}: ${error.message}`);
    }
  }
}

sendEmails();
