import type { Prospect } from "@/generated/prisma";

const BRAND_NAME = "AionSite";
const BRAND_EMAIL = "contacto@aionsite.com.mx";
const BRAND_LOGO_URL = "https://aionsite.com.mx/logo-aionsite.png";
const BRAND_WHATSAPP_URL =
  "https://wa.me/5219381238531?text=Hola%20AionSite%2C%20quiero%20que%20me%20envien%20el%20video.";

export type EmailVariant = "a" | "b";

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

function toSentenceCase(value: string) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toLowerCase() + normalized.slice(1);
}

function getSpecificProblem(prospect: ProspectEmailModel) {
  return (
    toSentenceCase(prospect.opportunity) ||
    "su presencia digital actual no esta convirtiendo bien el trafico en contactos"
  );
}

function buildVariantA(prospect: ProspectEmailModel) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;
  const businessType = "negocios como el suyo";
  const specificProblem = getSpecificProblem(prospect);
  const subject = `${prospect.name}: vi algo importante`;
  const text = `${greeting}

Hay algo importante:

Ahora mismo hay personas buscando ${businessType} en su zona... y no todos estan llegando a ustedes.

En su caso es porque ${specificProblem}.

Esto normalmente hace que esos clientes terminen con la competencia.

Si quieres, te grabo un video corto mostrandote exactamente que esta pasando y como solucionarlo.

Te lo mando?

${BRAND_NAME}`;
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
            <p style="margin:0 0 18px;color:#e2e8f0;font-size:16px;line-height:1.75;">${escapeHtml(
              greeting
            )}</p>
            <p style="margin:0 0 18px;color:#f8fafc;font-size:22px;line-height:1.5;font-weight:700;">Hay algo importante:</p>
            <p style="margin:0 0 18px;color:#cbd5e1;font-size:16px;line-height:1.75;">Ahora mismo hay personas buscando ${escapeHtml(
              businessType
            )} en su zona... y no todos estan llegando a ustedes.</p>
            <p style="margin:0 0 18px;color:#cbd5e1;font-size:16px;line-height:1.75;">En su caso es porque ${escapeHtml(
              specificProblem
            )}.</p>
            <p style="margin:0 0 18px;color:#cbd5e1;font-size:16px;line-height:1.75;">Esto normalmente hace que esos clientes terminen con la competencia.</p>
            <p style="margin:0 0 24px;color:#cbd5e1;font-size:16px;line-height:1.75;">Si quieres, te grabo un video corto mostrandote exactamente que esta pasando y como solucionarlo.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 8px;">
            <div style="background:linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.88));border:1px solid rgba(96,165,250,0.24);border-radius:20px;padding:20px 22px;">
              <p style="margin:0;color:#f8fafc;font-size:18px;font-weight:700;">Te lo mando?</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 28px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-radius:999px;background:#2563eb;">
                  <a href="${BRAND_WHATSAPP_URL}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Si, mandalo</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;color:#94a3b8;font-size:13px;line-height:1.7;">
            <p style="margin:0 0 8px;color:#e2e8f0;">${BRAND_NAME}</p>
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

function buildVariantB(prospect: ProspectEmailModel) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;
  const subject = `${prospect.name}: vi algo interesante`;
  const text = `${greeting}

Estuve viendo ${prospect.name} y note algo interesante.

Tienen potencial para atraer mas clientes de los que estan llegando ahora mismo.

Vi un par de puntos rapidos que podrian mejorar eso sin necesidad de invertir en publicidad.

Si quieres, te explico en un video de 2 minutos exactamente que cambiar.

Te lo envio?

${BRAND_NAME}`;
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
            <p style="margin:0 0 18px;color:#e2e8f0;font-size:16px;line-height:1.75;">${escapeHtml(
              greeting
            )}</p>
            <p style="margin:0 0 18px;color:#cbd5e1;font-size:16px;line-height:1.75;">Estuve viendo ${escapeHtml(
              prospect.name
            )} y note algo interesante.</p>
            <p style="margin:0 0 18px;color:#f8fafc;font-size:20px;line-height:1.55;font-weight:700;">Tienen potencial para atraer mas clientes de los que estan llegando ahora mismo.</p>
            <p style="margin:0 0 18px;color:#cbd5e1;font-size:16px;line-height:1.75;">Vi un par de puntos rapidos que podrian mejorar eso sin necesidad de invertir en publicidad.</p>
            <p style="margin:0 0 24px;color:#cbd5e1;font-size:16px;line-height:1.75;">Si quieres, te explico en un video de 2 minutos exactamente que cambiar.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 8px;">
            <div style="background:linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.88));border:1px solid rgba(96,165,250,0.24);border-radius:20px;padding:20px 22px;">
              <p style="margin:0;color:#f8fafc;font-size:18px;font-weight:700;">Te lo envio?</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 28px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-radius:999px;background:#2563eb;">
                  <a href="${BRAND_WHATSAPP_URL}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Si, envialo</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;color:#94a3b8;font-size:13px;line-height:1.7;">
            <p style="margin:0 0 8px;color:#e2e8f0;">${BRAND_NAME}</p>
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

export function buildEmail(prospect: ProspectEmailModel, variant: EmailVariant = "a") {
  if (variant === "b") {
    return buildVariantB(prospect);
  }

  return buildVariantA(prospect);
}
