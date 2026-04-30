import type { Prospect } from "@/generated/prisma";

const BRAND_NAME = "AionSite";
const BRAND_EMAIL = "contacto@aionsite.com.mx";
const BRAND_LOGO_URL = "https://aionsite.com.mx/logo-aionsite.png";
const BRAND_WHATSAPP_URL =
  "https://wa.me/5219381238531?text=Hola%20AionSite%2C%20quiero%20que%20me%20envien%20el%20video.";

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

// --- Helpers ---

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

// Mapea el typeLabel de Google Places a una descripcion en espanol para el email
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
  };

  return map[type] || "negocios locales";
}

// "en Ciudad" solo si la ciudad es conocida y no es generico
function getCityPhrase(city: string): string {
  const normalized = (city || "").trim();

  if (!normalized || normalized.toLowerCase() === "mexico") {
    return "en su zona";
  }

  return `en ${normalized}`;
}

// Frase de prueba social basada en reseñas y calificacion
function getSocialProofLine(
  userRatingCount: number | null | undefined,
  rating?: string | null
): string {
  const count = typeof userRatingCount === "number" && userRatingCount > 0 ? userRatingCount : 0;
  const stars = parseFloat(rating || "0");
  const hasHighRating = stars >= 4.5 && count >= 10;
  const ratingPrefix = hasHighRating ? `Con ${stars} estrellas y ` : count > 0 ? "Con " : "";
  const countSuffix =
    count >= 100
      ? `mas de ${count} reseñas`
      : count >= 10
        ? `${count} reseñas`
        : "";

  if (hasHighRating && count >= 100) {
    return `${ratingPrefix}${countSuffix} tienen una reputacion destacada. El siguiente paso es convertir esa confianza en contactos directos desde su sitio.`;
  }

  if (hasHighRating && count >= 10) {
    return `${ratingPrefix}${countSuffix} en Google ya tienen una ventaja de reputacion. Bien aprovechada, convierte mucho mejor.`;
  }

  if (count >= 100) {
    return `Con mas de ${count} reseñas tienen una reputacion solida. El siguiente paso es convertir esa confianza en contactos directos.`;
  }

  if (count >= 30) {
    return `Sus ${count} reseñas muestran que ya tienen clientes activos. Eso es exactamente el tipo de negocio que puede crecer mas rapido con la presencia digital correcta.`;
  }

  if (count >= 10) {
    return `Ya tienen reseñas en Google, lo que dice mucho. El problema es que no todos los que los buscan terminan contactandolos.`;
  }

  return "";
}

function getSpecificProblem(prospect: ProspectEmailModel) {
  return (
    toSentenceCase(prospect.opportunity) ||
    "su presencia digital actual no esta convirtiendo bien el trafico en contactos"
  );
}

// --- Variantes HTML base (reutilizable) ---

function buildBaseHtml(params: {
  greeting: string;
  paragraphs: string[];
  ctaText: string;
  ctaButtonLabel: string;
}) {
  const pHtml = params.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 18px;color:#cbd5e1;font-size:16px;line-height:1.75;">${escapeHtml(p)}</p>`
    )
    .join("\n            ");

  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background:rgb(15,23,42);font-family:Arial,sans-serif;color:#e2e8f0;">
    <div style="padding:32px 16px;background:rgb(15,23,42);">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;margin:0 auto;background:rgb(15,23,42);border:1px solid rgba(148,163,184,0.18);border-radius:24px;overflow:hidden;">
        <tr>
          <td style="padding:28px 28px 12px;">
            <img src="${BRAND_LOGO_URL}" alt="${BRAND_NAME}" width="220" style="display:block;width:220px;max-width:100%;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:8px 28px 0;">
            <p style="margin:0 0 18px;color:#e2e8f0;font-size:16px;line-height:1.75;">${escapeHtml(params.greeting)}</p>
            ${pHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 8px;">
            <div style="background:linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.88));border:1px solid rgba(96,165,250,0.24);border-radius:20px;padding:20px 22px;">
              <p style="margin:0;color:#f8fafc;font-size:18px;font-weight:700;">${escapeHtml(params.ctaText)}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 28px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-radius:999px;background:#2563eb;">
                  <a href="${BRAND_WHATSAPP_URL}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">${escapeHtml(params.ctaButtonLabel)}</a>
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
}

// --- Variante A: angulo directo "alguien los esta buscando" ---
function buildVariantA(prospect: ProspectEmailModel) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;
  const nicheLabel = getNicheLabel(prospect.primaryType || "");
  const cityPhrase = getCityPhrase(prospect.city);
  const specificProblem = getSpecificProblem(prospect);
  const socialProof = getSocialProofLine(prospect.userRatingCount, prospect.rating);

  // Mejorado: Agregar urgencia y especificidad
  const subject = prospect.contactName
    ? `⚡ ${prospect.contactName}, clientes buscando ${nicheLabel} en ${prospect.city} pero no te ven`
    : `⚡ ${prospect.name}: clientes en ${prospect.city} buscando ${nicheLabel} no te encuentran`;

  const paragraphs = [
    `Ahora mismo hay personas buscando ${nicheLabel} ${cityPhrase}... y no todos estan llegando a ustedes.`,
    `En su caso es porque ${specificProblem}.`,
    ...(socialProof ? [socialProof] : []),
    `Esto normalmente hace que esos clientes terminen con la competencia.`,
    `Si quieres, te grabo un video corto mostrandote exactamente que esta pasando y como solucionarlo.`,
  ];

  const text = `${greeting}

${paragraphs.join("\n\n")}

Te lo mando?

${BRAND_NAME}`;

  const html = buildBaseHtml({
    greeting,
    paragraphs,
    ctaText: "Te lo mando?",
    ctaButtonLabel: "Si, mandalo",
  });

  return { subject, text, html };
}

// --- Variante B: angulo suave "note algo interesante" ---
function buildVariantB(prospect: ProspectEmailModel) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;
  const cityPhrase = getCityPhrase(prospect.city);
  const socialProof = getSocialProofLine(prospect.userRatingCount, prospect.rating);
  // Mejorado: Más específico que "algo" - menciona que es corregible
  const subject = `${prospect.name}: detecté un problema rápido de arreglar`;

  const paragraphs = [
    `Estuve revisando ${prospect.name} y encontre algo concreto que podria mejorar lo que ya tienen.`,
    `Tienen potencial para captar mas clientes ${cityPhrase} — y no necesitan invertir en publicidad para lograrlo.`,
    ...(socialProof ? [socialProof] : []),
    `Lo que vi se puede ajustar rapido. En un video de 2 minutos te lo muestro exactamente.`,
    `Le echo un ojo?`,
  ];

  const text = `${greeting}

${paragraphs.join("\n\n")}

${BRAND_NAME}`;

  const html = buildBaseHtml({
    greeting,
    paragraphs,
    ctaText: "Le echo un ojo?",
    ctaButtonLabel: "Si, lo quiero ver",
  });

  return { subject, text, html };
}

// --- Variante C: angulo de oportunidad especifica por nicho ---
function buildVariantC(prospect: ProspectEmailModel) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;
  const nicheLabel = getNicheLabel(prospect.primaryType || "");
  const cityPhrase = getCityPhrase(prospect.city);
  const specificProblem = getSpecificProblem(prospect);
  // Mejorado: Más específico - describe un hallazgo concreto
  const subject = `${prospect.name}: mejora detectable en búsquedas Google de ${nicheLabel}`;

  const paragraphs = [
    `Estuve buscando ${nicheLabel} ${cityPhrase} y ${prospect.name} aparecio en los resultados.`,
    `Al revisar su presencia encontre algo puntual: ${specificProblem}.`,
    `Eso normalmente se resuelve sin ads ni presupuesto grande. Con los ajustes correctos, los que ya los encuentran terminan contactandolos.`,
    `Le mando un video de 2 minutos mostrando exactamente lo que detecte y como atacarlo?`,
  ];

  const text = `${greeting}

${paragraphs.join("\n\n")}

Lo revisa?

${BRAND_NAME}`;

  const html = buildBaseHtml({
    greeting,
    paragraphs,
    ctaText: "Lo revisa?",
    ctaButtonLabel: "Si, mandame el video",
  });

  return { subject, text, html };
}

// --- Variante D: angulo de potencial propio sin explotar ---
function buildVariantD(prospect: ProspectEmailModel) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;
  const cityPhrase = getCityPhrase(prospect.city);
  const pitchAngle = toSentenceCase(prospect.pitchAngle) || "captar mas contactos directos";
  const socialProof = getSocialProofLine(prospect.userRatingCount, prospect.rating);
  // Mejorado: Más específico en el potencial (sin detalles presuntuosos)
  const subject = `${prospect.name}: tu negocio podría captar 2-3x más clientes desde Google`;

  const paragraphs = [
    `Estuve revisando la presencia digital de ${prospect.name} ${cityPhrase}.`,
    `Tienen cosas buenas, pero hay potencial que todavia no esta trabajando: ${pitchAngle}.`,
    ...(socialProof ? [socialProof] : []),
    `Con un par de ajustes puntuales eso cambia, sin necesidad de invertir en publicidad.`,
    `Le grabo un video corto mostrando exactamente que ajustaria y por que funcionaria para su negocio?`,
  ];

  const text = `${greeting}

${paragraphs.join("\n\n")}

Se lo mando?

${BRAND_NAME}`;

  const html = buildBaseHtml({
    greeting,
    paragraphs,
    ctaText: "Se lo mando?",
    ctaButtonLabel: "Si, lo quiero ver",
  });

  return { subject, text, html };
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
