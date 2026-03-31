import type { Prospect } from "@/generated/prisma";
import { normalizeName } from "@/lib/normalizers";

const BRAND_NAME = "AionSite";
const BRAND_EMAIL = "contacto@aionsite.com.mx";
const BRAND_LOGO_URL = "https://aionsite.com.mx/logo-aionsite.png";
const BRAND_WHATSAPP_URL =
  "https://wa.me/5219381238531?text=Hola%20AionSite%2C%20me%20gustaria%20recibir%20el%20video%20rapido.";

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

function isRestaurantProspect(prospect: ProspectEmailModel) {
  const type = normalizeName(prospect.type || "");
  const opportunity = normalizeName(prospect.opportunity || "");
  const recommendation = normalizeName(prospect.recommendedSite || "");
  const pitchAngle = normalizeName(prospect.pitchAngle || "");

  if (type === "restaurant" || type === "restaurante") {
    return true;
  }

  return [opportunity, recommendation, pitchAngle].some((value) =>
    ["reserva", "reservas", "menu", "pedidos", "restaurante"].some((keyword) =>
      value.includes(keyword)
    )
  );
}

export function buildEmail(prospect: ProspectEmailModel) {
  const subject = `${prospect.name}: vi algo importante`;

  if (isRestaurantProspect(prospect)) {
    const greeting = `Hola equipo de ${prospect.name},`;
    const text = `${greeting}

Vi su restaurante y hay algo importante:

Ahora mismo hay gente buscandolos para reservar... pero una parte de esas reservas se estan yendo a otros lugares.

Esto pasa cuando la experiencia online no esta optimizada para convertir visitas en reservas.

Si quieren, les grabo un video corto mostrandoles exactamente donde estan perdiendo esas reservas y como recuperarlas.

Se los mando?

Felipe
${BRAND_NAME}
${BRAND_EMAIL}`;

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
            <h1 style="margin:0 0 18px;color:#f8fafc;font-size:30px;line-height:1.12;">Vi algo importante en ${escapeHtml(
              prospect.name
            )}.</h1>
            <p style="margin:0 0 18px;color:#e2e8f0;font-size:16px;line-height:1.75;">${escapeHtml(
              greeting
            )}</p>
            <p style="margin:0 0 18px;color:#cbd5e1;font-size:16px;line-height:1.75;">Vi su restaurante y hay algo importante:</p>
            <p style="margin:0 0 18px;color:#f8fafc;font-size:20px;line-height:1.55;font-weight:700;">Ahora mismo hay gente buscandolos para reservar... pero una parte de esas reservas se estan yendo a otros lugares.</p>
            <p style="margin:0 0 18px;color:#cbd5e1;font-size:16px;line-height:1.75;">Esto pasa cuando la experiencia online no esta optimizada para convertir visitas en reservas.</p>
            <p style="margin:0 0 24px;color:#cbd5e1;font-size:16px;line-height:1.75;">Si quieren, les grabo un video corto mostrandoles exactamente donde estan perdiendo esas reservas y como recuperarlas.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 8px;">
            <div style="background:linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.88));border:1px solid rgba(96,165,250,0.24);border-radius:20px;padding:20px 22px;">
              <p style="margin:0;color:#f8fafc;font-size:18px;font-weight:700;">Se los mando?</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 28px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-radius:999px;background:#2563eb;">
                  <a href="${BRAND_WHATSAPP_URL}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Si, mandenlo</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;color:#94a3b8;font-size:13px;line-height:1.7;">
            <p style="margin:0 0 8px;color:#e2e8f0;">Felipe<br />${BRAND_NAME}</p>
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

  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;
  const specificProblem =
    toSentenceCase(prospect.opportunity) ||
    "su presencia digital actual no esta convirtiendo bien ese trafico en contactos";

  const text = `${greeting}

Vi su negocio y hay algo importante:

Ahora mismo hay gente buscandolos en Google... y no estan captando esos clientes.

En su caso es por ${specificProblem}.

Esto normalmente hace que esos clientes se vayan con la competencia.

Si quieres, te grabo un video rapido (2 min) mostrandote exactamente que esta pasando y como arreglarlo.

Te lo mando?

Felipe
${BRAND_NAME}
${BRAND_EMAIL}`;

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
            <h1 style="margin:0 0 18px;color:#f8fafc;font-size:30px;line-height:1.12;">Vi algo importante en ${escapeHtml(
              prospect.name
            )}.</h1>
            <p style="margin:0 0 18px;color:#e2e8f0;font-size:16px;line-height:1.75;">${escapeHtml(
              greeting
            )}</p>
            <p style="margin:0 0 18px;color:#cbd5e1;font-size:16px;line-height:1.75;">Vi su negocio y hay algo importante:</p>
            <p style="margin:0 0 18px;color:#f8fafc;font-size:20px;line-height:1.55;font-weight:700;">Ahora mismo hay gente buscandolos en Google... y no estan captando esos clientes.</p>
            <p style="margin:0 0 18px;color:#cbd5e1;font-size:16px;line-height:1.75;">En su caso es por ${escapeHtml(
              specificProblem
            )}.</p>
            <p style="margin:0 0 18px;color:#cbd5e1;font-size:16px;line-height:1.75;">Esto normalmente hace que esos clientes se vayan con la competencia.</p>
            <p style="margin:0 0 24px;color:#cbd5e1;font-size:16px;line-height:1.75;">Si quieres, te grabo un video rapido (2 min) mostrandote exactamente que esta pasando y como arreglarlo.</p>
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
                  <a href="${BRAND_WHATSAPP_URL}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Si, mandamelo</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;color:#94a3b8;font-size:13px;line-height:1.7;">
            <p style="margin:0 0 8px;color:#e2e8f0;">Felipe<br />${BRAND_NAME}</p>
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
