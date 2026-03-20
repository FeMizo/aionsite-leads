import type { Prospect } from "@/generated/prisma";

const BRAND_NAME = "AionSite";
const BRAND_EMAIL = "contacto@aionsite.com.mx";
const BRAND_SITE_URL = "https://aionsite.com.mx/";
const BRAND_LOGO_URL = "https://aionsite.com.mx/logo-aionsite.png";
const BRAND_WHATSAPP_URL =
  "https://wa.me/5219381238531?text=Hola%20AionSite%2C%20me%20gustaria%20cotizar%20un%20sitio%20web.";

export type ProspectEmailModel = Pick<
  Prospect,
  | "name"
  | "contactName"
  | "city"
  | "email"
  | "type"
  | "website"
  | "rating"
  | "opportunity"
  | "recommendedSite"
  | "pitchAngle"
>;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildEmail(prospect: ProspectEmailModel) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;

  const websiteLine = prospect.website
    ? "Revise su presencia digital y detecte espacio para que su sitio se vea mas solido, comunique mejor y convierta mas visitas en contactos."
    : "Revise su presencia digital y detecte que todavia pueden ganar mucha confianza con un sitio claro, moderno y enfocado en conversion.";

  const ratingLine = prospect.rating
    ? `Tambien vi que tienen una calificacion de ${prospect.rating}, lo cual ya es una base fuerte para capitalizar mejor el trafico que reciben.`
    : "";

  const typeLine = prospect.type
    ? `En negocios como ${prospect.type.toLowerCase()}, una presencia digital bien ejecutada ayuda mucho a ${
        prospect.pitchAngle || "atraer mas clientes"
      }.`
    : "";

  const recommendationLine = prospect.recommendedSite
    ? `Para ustedes tendria sentido desarrollar un ${prospect.recommendedSite}.`
    : "";

  const opportunityLine = prospect.opportunity
    ? `Veo una oportunidad clara en ${prospect.name}: ${prospect.opportunity}.`
    : `Veo una oportunidad clara para que ${prospect.name} convierta mejor su visibilidad actual en contactos reales.`;

  const proposalLine =
    "Si les hace sentido, puedo compartirles una propuesta visual rapida sin costo para mostrarles como podria verse su siguiente sitio web.";
  const closingLine =
    "Si quieren, pueden responder este correo o escribirme directo por WhatsApp.";
  const subject = `${prospect.name}: idea para captar mas clientes online`;

  const text = `${greeting}

Estaba revisando negocios locales en Google y encontre ${prospect.name} en ${
    prospect.city || "su zona"
  }.

${websiteLine}
${ratingLine}
${typeLine}

${opportunityLine}

${recommendationLine}

En ${BRAND_NAME} desarrollamos sitios web modernos para negocios locales en Mexico, enfocados en transmitir confianza, cargar rapido y generar mas contactos.

${proposalLine}

${closingLine}

Sitio: ${BRAND_SITE_URL}
WhatsApp: ${BRAND_WHATSAPP_URL}

Saludos,
Felipe
${BRAND_NAME}
${BRAND_EMAIL}`;

  const summaryItems = [
    websiteLine,
    ratingLine,
    typeLine,
    opportunityLine,
    recommendationLine,
  ].filter(Boolean);

  const htmlSummary = summaryItems
    .map(
      (item) =>
        `<li style="margin:0 0 10px;color:#cbd5e1;">${escapeHtml(item)}</li>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background:#020617;font-family:Arial,sans-serif;color:#e2e8f0;">
    <div style="padding:32px 16px;background:radial-gradient(circle at top,#2563eb 0%,#020617 42%);">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;margin:0 auto;background:#0f172a;border:1px solid rgba(148,163,184,0.18);border-radius:24px;overflow:hidden;">
        <tr>
          <td style="padding:28px 28px 12px;">
            <img src="${BRAND_LOGO_URL}" alt="${BRAND_NAME}" width="220" style="display:block;width:220px;max-width:100%;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:8px 28px 0;">
            <p style="margin:0 0 12px;color:#93c5fd;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;">Idea rapida para ${escapeHtml(
              prospect.name
            )}</p>
            <h1 style="margin:0 0 18px;color:#f8fafc;font-size:30px;line-height:1.12;">Una presencia digital mas fuerte puede traerle mas clientes a ${escapeHtml(
              prospect.name
            )}.</h1>
            <p style="margin:0 0 18px;color:#e2e8f0;font-size:16px;line-height:1.75;">${escapeHtml(
              greeting
            )}</p>
            <p style="margin:0 0 18px;color:#cbd5e1;font-size:16px;line-height:1.75;">Estaba revisando negocios locales en Google y encontre ${escapeHtml(
              prospect.name
            )} en ${escapeHtml(prospect.city || "su zona")}.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 8px;">
            <div style="background:linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.88));border:1px solid rgba(96,165,250,0.24);border-radius:20px;padding:20px 22px;">
              <p style="margin:0 0 14px;color:#f8fafc;font-size:17px;font-weight:700;">Lo que vi en su caso</p>
              <ul style="margin:0;padding:0 0 0 18px;">${htmlSummary}</ul>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 28px 0;">
            <p style="margin:0 0 18px;color:#cbd5e1;font-size:16px;line-height:1.75;">En ${BRAND_NAME} desarrollamos sitios web modernos para negocios locales en Mexico, con foco en confianza, velocidad, SEO tecnico y conversion.</p>
            <p style="margin:0 0 24px;color:#cbd5e1;font-size:16px;line-height:1.75;">${escapeHtml(
              proposalLine
            )}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-radius:999px;background:#2563eb;">
                  <a href="${BRAND_WHATSAPP_URL}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Hablar por WhatsApp</a>
                </td>
                <td style="padding-left:12px;">
                  <a href="${BRAND_SITE_URL}" style="color:#93c5fd;font-size:15px;font-weight:700;text-decoration:none;">Ver sitio</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;color:#94a3b8;font-size:13px;line-height:1.7;">
            <p style="margin:0 0 8px;color:#e2e8f0;">Saludos,<br />Felipe<br />${BRAND_NAME}</p>
            <p style="margin:0;">
              <a href="mailto:${BRAND_EMAIL}" style="color:#93c5fd;text-decoration:none;">${BRAND_EMAIL}</a>
            </p>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}
