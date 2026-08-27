import type { Prospect } from "@/generated/prisma";

const BRAND_NAME = "AionSite";
const BRAND_EMAIL = "contacto@aionsite.com.mx";
const BRAND_LOGO_URL = "https://aionsite.com.mx/logo-aionsite.png";
const BRAND_WHATSAPP_URL =
  "https://wa.me/5219381238531?text=Hola%20AionSite%2C%20quiero%20que%20me%20envien%20la%20propuesta.";

export type EmailVariant = "a" | "b" | "c" | "d";

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
> & {
  userRatingCount?: number | null;
  primaryType?: string | null;
};

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

function getNicheLabel(type: string): string {
  const map: Record<string, string> = {
    dentist: "consultorios dentales",
    doctor: "clinicas medicas",
    lawyer: "despachos juridicos",
    beauty_salon: "salones de belleza y esteticas",
    car_repair: "talleres mecanicos",
    restaurant: "restaurantes y fondas",
    lodging: "hoteles y hospedajes",
    gym: "gimnasios y centros deportivos",
    real_estate_agency: "agencias inmobiliarias",
    veterinary_care: "clinicas veterinarias",
    school: "academias y escuelas",
    accounting: "despachos contables",
    water_purification: "purificadoras de agua",
    clothing_store: "tiendas de ropa",
    store: "tiendas locales",
  };

  return map[type] || "negocios locales";
}

function getCityPhrase(city: string): string {
  const normalized = (city || "").trim();

  if (!normalized || normalized.toLowerCase() === "mexico") {
    return "en su zona";
  }

  return `en ${normalized}`;
}

function getSocialProofLine(
  userRatingCount: number | null | undefined,
  rating?: string | null
) {
  const count =
    typeof userRatingCount === "number" && userRatingCount > 0 ? userRatingCount : 0;
  const stars = parseFloat(rating || "0");
  const hasHighRating = stars >= 4.5 && count >= 10;

  if (hasHighRating && count >= 100) {
    return `Con ${stars} estrellas y mas de ${count} resenas, ya tienen una reputacion fuerte para convertir mejor.`;
  }

  if (hasHighRating && count >= 10) {
    return `Con ${stars} estrellas y ${count} resenas, ya tienen una buena base para captar mas contactos.`;
  }

  if (count >= 100) {
    return `Con mas de ${count} resenas ya tienen confianza; el siguiente paso es convertirla en contactos.`;
  }

  if (count >= 10) {
    return `Ya tienen ${count} resenas en Google; con ajustes puntuales ese interes puede convertirse en mas contactos.`;
  }

  return "";
}

function getSpecificOpportunity(prospect: ProspectEmailModel) {
  return (
    toSentenceCase(prospect.opportunity) ||
    "hay margen para convertir mas visitas en contactos directos"
  );
}

function buildBaseHtml(params: {
  greeting: string;
  paragraphs: string[];
  ctaText: string;
  ctaButtonLabel: string;
}) {
  const pHtml = params.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;color:#cbd5e1;font-size:16px;line-height:1.65;">${escapeHtml(p)}</p>`
    )
    .join("\n            ");

  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background:rgb(15,23,42);font-family:Arial,sans-serif;color:#e2e8f0;">
    <div style="padding:32px 16px;background:rgb(15,23,42);">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:rgb(15,23,42);border:1px solid rgba(148,163,184,0.18);border-radius:20px;overflow:hidden;">
        <tr>
          <td style="padding:26px 26px 10px;">
            <img src="${BRAND_LOGO_URL}" alt="${BRAND_NAME}" width="200" style="display:block;width:200px;max-width:100%;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:8px 26px 0;">
            <p style="margin:0 0 16px;color:#e2e8f0;font-size:16px;line-height:1.65;">${escapeHtml(params.greeting)}</p>
            ${pHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:2px 26px 10px;">
            <div style="background:rgba(37,99,235,0.16);border:1px solid rgba(96,165,250,0.24);border-radius:16px;padding:16px 18px;">
              <p style="margin:0;color:#f8fafc;font-size:17px;font-weight:700;">${escapeHtml(params.ctaText)}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 26px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-radius:999px;background:#2563eb;">
                  <a href="${BRAND_WHATSAPP_URL}" style="display:inline-block;padding:13px 20px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">${escapeHtml(params.ctaButtonLabel)}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:26px;color:#94a3b8;font-size:13px;line-height:1.7;">
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
}

function buildMessage(params: {
  subject: string;
  greeting: string;
  paragraphs: string[];
  ctaText: string;
  ctaButtonLabel: string;
}) {
  const text = `${params.greeting}

${params.paragraphs.join("\n\n")}

${params.ctaText}

${BRAND_NAME}`;
  const html = buildBaseHtml(params);

  return { subject: params.subject, text, html };
}

function buildVariantA(prospect: ProspectEmailModel) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;
  const nicheLabel = getNicheLabel(prospect.primaryType || "");
  const cityPhrase = getCityPhrase(prospect.city);
  const socialProof = getSocialProofLine(prospect.userRatingCount, prospect.rating);
  const subject = prospect.contactName
    ? `${prospect.contactName}, idea breve para captar mas clientes`
    : `${prospect.name}: idea breve para captar mas clientes`;
  const paragraphs = [
    "Soy Felipe, desarrollador web en AionSite. Trabajo con negocios locales para mejorar su presencia digital y convertir mas visitas en contactos.",
    `Vi una oportunidad para que ${prospect.name} capte mas contactos de personas que buscan ${nicheLabel} ${cityPhrase}.`,
    `Puntualmente: ${getSpecificOpportunity(prospect)}.`,
    ...(socialProof ? [socialProof] : []),
    "Si te sirve, te mando una propuesta con 2 o 3 ajustes concretos.",
  ];

  return buildMessage({
    subject,
    greeting,
    paragraphs,
    ctaText: "Te lo mando?",
    ctaButtonLabel: "Si, mandalo",
  });
}

function buildVariantB(prospect: ProspectEmailModel) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;
  const cityPhrase = getCityPhrase(prospect.city);
  const subject = `${prospect.name}: mejora rapida para captar mas clientes`;
  const paragraphs = [
    "Soy Felipe, desarrollador web en AionSite. Te escribo con respeto porque estuve viendo su presencia digital.",
    `Estuve revisando ${prospect.name} y vi una mejora sencilla para captar mas clientes ${cityPhrase}.`,
    "No es algo complicado ni requiere empezar con publicidad.",
    "Si quieres, te mando una propuesta con lo que ajustaria.",
  ];

  return buildMessage({
    subject,
    greeting,
    paragraphs,
    ctaText: "Le echo un ojo?",
    ctaButtonLabel: "Si, lo quiero ver",
  });
}

function buildVariantC(prospect: ProspectEmailModel) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;
  const nicheLabel = getNicheLabel(prospect.primaryType || "");
  const cityPhrase = getCityPhrase(prospect.city);
  const subject = `${prospect.name}: oportunidad en busquedas de Google`;
  const paragraphs = [
    "Soy Felipe, desarrollador web en AionSite. Estaba revisando negocios locales y me llamo la atencion su caso.",
    `Buscando ${nicheLabel} ${cityPhrase}, vi a ${prospect.name} y encontre una oportunidad puntual.`,
    `${getSpecificOpportunity(prospect)}.`,
    "Te puedo mandar una propuesta con la mejora que haria primero?",
  ];

  return buildMessage({
    subject,
    greeting,
    paragraphs,
    ctaText: "Lo revisa?",
    ctaButtonLabel: "Si, mandamela",
  });
}

function buildVariantD(prospect: ProspectEmailModel) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;
  const cityPhrase = getCityPhrase(prospect.city);
  const pitchAngle = toSentenceCase(prospect.pitchAngle) || "captar mas contactos directos";
  const socialProof = getSocialProofLine(prospect.userRatingCount, prospect.rating);
  const subject = `${prospect.name}: captar mas clientes desde Google`;
  const paragraphs = [
    "Soy Felipe, desarrollador web en AionSite. Vi su negocio y quise escribirles con una idea concreta.",
    `Estuve revisando la presencia digital de ${prospect.name} ${cityPhrase}.`,
    `Vi potencial para mejorar ${pitchAngle}.`,
    ...(socialProof ? [socialProof] : []),
    "Si te interesa, te mando una propuesta con los ajustes que haria primero.",
  ];

  return buildMessage({
    subject,
    greeting,
    paragraphs,
    ctaText: "Se lo mando?",
    ctaButtonLabel: "Si, lo quiero ver",
  });
}

export function buildEmail(prospect: ProspectEmailModel, variant: EmailVariant = "a") {
  if (variant === "b") {
    return buildVariantB(prospect);
  }

  if (variant === "c") {
    return buildVariantC(prospect);
  }

  if (variant === "d") {
    return buildVariantD(prospect);
  }

  return buildVariantA(prospect);
}
