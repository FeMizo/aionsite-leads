import type { Prospect } from "@/generated/prisma";
import { normalizeProspectLanguage, type ProspectLanguage } from "@/lib/prospect-language";

const BRAND_NAME = "AionSite";
const BRAND_EMAIL = "contacto@aionsite.com.mx";
const BRAND_PHONE = "+52 938 157 3988";
const BRAND_PHONE_TEL = "+529381573988";
const BRAND_WHATSAPP_URL =
  "https://wa.me/5219381238531?text=Hola%20AionSite%2C%20quiero%20que%20me%20envien%20la%20propuesta.";
const SERVICES_CANVA_URL = "https://canva.link/uk8xoudaah19yry";

export type CrawlEmailReport = {
  headline: string;
  findings: Array<{ title: string; pageCount: number; impact: string }>;
  scopeNote: string;
};

export type EmailVariant = "a" | "b" | "c" | "d";

export type ProspectEmailModel = Pick<
  Prospect,
  | "name"
  | "contactName"
  | "city"
  | "languageCode"
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

export function getProspectLanguage(prospect: Pick<ProspectEmailModel, "languageCode" | "city">): ProspectLanguage {
  return normalizeProspectLanguage(prospect.languageCode);
}

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
    doctor: "clínicas médicas",
    lawyer: "despachos jurídicos",
    beauty_salon: "salones de belleza y estéticas",
    car_repair: "talleres mecánicos",
    restaurant: "restaurantes y fondas",
    lodging: "hoteles y hospedajes",
    gym: "gimnasios y centros deportivos",
    real_estate_agency: "agencias inmobiliarias",
    veterinary_care: "clínicas veterinarias",
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
    return `Con ${stars} estrellas y más de ${count} reseñas, ya tienen una reputación fuerte para convertir mejor.`;
  }

  if (hasHighRating && count >= 10) {
    return `Con ${stars} estrellas y ${count} reseñas, ya tienen una buena base para captar más contactos.`;
  }

  if (count >= 100) {
    return `Con más de ${count} reseñas ya tienen confianza; el siguiente paso es convertirla en contactos.`;
  }

  if (count >= 10) {
    return `Ya tienen ${count} reseñas en Google; con ajustes puntuales ese interés puede convertirse en más contactos.`;
  }

  return "";
}

function getSpecificOpportunity(prospect: ProspectEmailModel) {
  return (
    toSentenceCase(prospect.opportunity) ||
    "hay margen para convertir más visitas en contactos directos"
  );
}

function buildBaseHtml(params: {
  greeting: string;
  paragraphs: string[];
  ctaText: string;
  ctaButtonLabel: string;
}) {
  const message = [params.greeting, ...params.paragraphs, params.ctaText].join("\n\n");
  return renderPremiumOutreachEmail({ message, ctaLabel: params.ctaButtonLabel }).html;
}

function escapeAndLinkify(value: string) {
  return escapeHtml(value).replace(/(https?:\/\/[^\s<]+)/g, (url) =>
    `<a href="${url}" style="color:#087f8c;text-decoration:underline;">${url}</a>`
  );
}

function renderMessageBlocks(message: string) {
  return message
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((block) => `<p style="margin:0 0 17px;color:#334155;font-size:15px;line-height:1.75;">${escapeAndLinkify(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function renderPremiumOutreachEmail(params: {
  message: string;
  report?: CrawlEmailReport | null;
  attachmentName?: string;
  ctaLabel?: string;
}) {
  const reportHtml = params.report
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 22px;background:#f3f8fa;border-left:4px solid #12a6a0;border-radius:4px;"><tr><td style="padding:18px 20px;"><p style="margin:0 0 8px;color:#102a43;font-size:16px;font-weight:700;">Resumen de la revisión</p><p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.6;">${escapeHtml(params.report.headline)}</p>${params.report.findings.map((finding) => `<p style="margin:0 0 10px;color:#334155;font-size:14px;line-height:1.6;"><strong style="color:#102a43;">${escapeHtml(finding.title)}</strong> · observado en ${finding.pageCount} ${finding.pageCount === 1 ? "página" : "páginas"}. ${escapeHtml(finding.impact)}</p>`).join("")}<p style="margin:10px 0 0;color:#64748b;font-size:12px;line-height:1.55;">${escapeHtml(params.report.scopeNote)}</p></td></tr></table>`
    : "";
  const attachmentHtml = params.attachmentName
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;background:#f8fafc;border:1px solid #dbe4ec;border-radius:8px;"><tr><td style="padding:13px 16px;color:#334155;font-size:13px;line-height:1.5;"><strong style="color:#102a43;">Informe adjunto</strong><br>${escapeHtml(params.attachmentName)} · PDF</td></tr></table>`
    : "";
  const ctaHtml = params.ctaLabel
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr><td bgcolor="#102a43" style="border-radius:6px;"><a href="${BRAND_WHATSAPP_URL}" style="display:inline-block;padding:13px 20px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(params.ctaLabel)}</a></td></tr></table>`
    : "";
  const reportText = params.report
    ? `\n\nResumen de la revisión\n${params.report.headline}${params.report.findings.map((finding) => `\n- ${finding.title}: observado en ${finding.pageCount} ${finding.pageCount === 1 ? "página" : "páginas"}. ${finding.impact}`).join("")}\n\n${params.report.scopeNote}`
    : "";
  const attachmentText = params.attachmentName ? `\n\nInforme PDF adjunto: ${params.attachmentName}` : "";
  const contactText = `\n\n${BRAND_NAME} · ${BRAND_EMAIL}\nTeléfono: ${BRAND_PHONE}\nSi prefieres, responde directamente a este correo.`;
  const preheader = params.report?.headline || "Una idea concreta para mejorar la presencia digital de tu negocio.";

  return {
    text: `${params.message.trim()}${reportText}${attachmentText}${contactText}`,
    html: `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f2f5f7;font-family:Arial,Helvetica,sans-serif;color:#102a43;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f2f5f7"><tr><td align="center" style="padding:28px 12px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px;background:#ffffff;border:1px solid #e1e8ee;border-radius:10px;overflow:hidden;"><tr><td height="5" bgcolor="#12a6a0" style="height:5px;font-size:0;line-height:0;">&nbsp;</td></tr><tr><td style="padding:25px 30px 12px;"><span style="color:#102a43;font-size:22px;font-weight:700;letter-spacing:-0.4px;">${BRAND_NAME}</span><span style="padding-left:9px;color:#12a6a0;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Presencia digital</span></td></tr><tr><td style="padding:15px 30px 8px;">${renderMessageBlocks(params.message)}${reportHtml}${attachmentHtml}${ctaHtml}</td></tr><tr><td style="padding:18px 30px 24px;border-top:1px solid #e8edf1;color:#64748b;font-size:12px;line-height:1.6;">${BRAND_NAME} · <a href="mailto:${BRAND_EMAIL}" style="color:#087f8c;text-decoration:none;">${BRAND_EMAIL}</a><br>Teléfono: <a href="tel:${BRAND_PHONE_TEL}" style="color:#087f8c;text-decoration:none;">${BRAND_PHONE}</a><br>Si prefieres, responde directamente a este correo.</td></tr></table></td></tr></table></body></html>`,
  };
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

Puedes ver nuestros servicios de forma visual aquí: ${SERVICES_CANVA_URL}

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
    ? `${prospect.contactName}, idea breve para captar más clientes`
    : `${prospect.name}: idea breve para captar más clientes`;
  const paragraphs = [
    "Soy Felipe, desarrollador web en AionSite. Ayudo a negocios locales a presentar con claridad sus servicios y a facilitar el contacto desde su sitio.",
    `Al revisar la presencia digital de ${prospect.name}, identifiqué una oportunidad relacionada con ${getSpecificOpportunity(prospect)}.`,
    `Resolver este punto podría ayudar a que quienes buscan ${nicheLabel} ${cityPhrase} entiendan mejor la oferta y encuentren con más facilidad el siguiente paso. El resultado depende de cómo respondan las personas que visitan el sitio.`,
    ...(socialProof ? [socialProof] : []),
    "Si te parece útil, puedo compartirte una propuesta breve con dos o tres ajustes, empezando por el más relevante.",
  ];

  return buildMessage({
    subject,
    greeting,
    paragraphs,
    ctaText: "¿Te lo mando?",
    ctaButtonLabel: "Sí, mándalo",
  });
}

function buildVariantB(prospect: ProspectEmailModel) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;
  const cityPhrase = getCityPhrase(prospect.city);
  const subject = `${prospect.name}: mejora rápida para captar más clientes`;
  const paragraphs = [
    "Soy Felipe, desarrollador web en AionSite. Estuve revisando la presencia digital de su negocio y encontré un aspecto que podría explicarse mejor a sus visitantes.",
    `La oportunidad está relacionada con cómo ${prospect.name} presenta sus servicios a las personas que buscan opciones ${cityPhrase}.`,
    "Una mejora en claridad o navegación puede facilitar que encuentren la información y sepan cómo contactar. No implica una garantía de más visitas o ventas.",
    "Si te interesa, puedo enviarte una propuesta corta con los primeros cambios que evaluaría.",
  ];

  return buildMessage({
    subject,
    greeting,
    paragraphs,
    ctaText: "¿Le echo un ojo?",
    ctaButtonLabel: "Sí, lo quiero ver",
  });
}

function buildVariantC(prospect: ProspectEmailModel) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;
  const nicheLabel = getNicheLabel(prospect.primaryType || "");
  const cityPhrase = getCityPhrase(prospect.city);
  const subject = `${prospect.name}: oportunidad en búsquedas de Google`;
  const paragraphs = [
    "Soy Felipe, desarrollador web en AionSite. Al revisar negocios locales, encontré una oportunidad concreta en la presencia digital de su negocio.",
    `Para personas que buscan ${nicheLabel} ${cityPhrase}, puede ser útil que la información principal y las opciones de contacto sean fáciles de encontrar.`,
    `En este caso, el punto que revisaría primero es: ${getSpecificOpportunity(prospect)}.`,
    "Si quieres, te comparto una propuesta breve para que valores si tiene sentido hacer ese ajuste.",
  ];

  return buildMessage({
    subject,
    greeting,
    paragraphs,
    ctaText: "¿Lo revisa?",
    ctaButtonLabel: "Sí, mándamela",
  });
}

function buildVariantD(prospect: ProspectEmailModel) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;
  const cityPhrase = getCityPhrase(prospect.city);
  const pitchAngle = toSentenceCase(prospect.pitchAngle) || "captar más contactos directos";
  const socialProof = getSocialProofLine(prospect.userRatingCount, prospect.rating);
  const subject = `${prospect.name}: captar más clientes desde Google`;
  const paragraphs = [
    "Soy Felipe, desarrollador web en AionSite. Quise escribirles con una observación concreta sobre su presencia digital.",
    `Al revisar ${prospect.name} ${cityPhrase}, vi una oportunidad para trabajar ${pitchAngle}.`,
    "Una presentación más clara puede ayudar a que las personas comprendan la oferta y encuentren cómo solicitar información; el efecto real depende de su audiencia.",
    ...(socialProof ? [socialProof] : []),
    "Si te interesa, puedo compartirte una propuesta con los ajustes que revisaría primero.",
  ];

  return buildMessage({
    subject,
    greeting,
    paragraphs,
    ctaText: "Se lo mando?",
    ctaButtonLabel: "Si, lo quiero ver",
  });
}

function buildLocalizedEmail(prospect: ProspectEmailModel, variant: EmailVariant) {
  const language = getProspectLanguage(prospect);
  const greeting = prospect.contactName
    ? language === "pt" ? `Olá ${prospect.contactName},` : language === "it" ? `Ciao ${prospect.contactName},` : `Hello ${prospect.contactName},`
    : language === "pt" ? `Olá, equipa de ${prospect.name},` : language === "it" ? `Buongiorno, team di ${prospect.name},` : `Hello ${prospect.name} team,`;
  const copy = {
    en: {
      subjects: [`${prospect.name}: a quick growth idea`, `${prospect.name}: one digital improvement`, `${prospect.name}: local search opportunity`, `${prospect.name}: more direct enquiries`],
      paragraphs: [
        "I’m Felipe, a web developer at AionSite. I help local businesses present their services clearly and make it easier for people to get in touch.",
        `I noticed an opportunity in ${prospect.name}'s online presence that may be worth reviewing for customers in ${prospect.city}.`,
        "I can share a short proposal with two or three practical improvements, starting with the most relevant one.",
      ],
      cta: "Would you like me to send it?", button: "Yes, send it",
    },
    pt: {
      subjects: [`${prospect.name}: uma ideia rápida de crescimento`, `${prospect.name}: uma melhoria digital`, `${prospect.name}: oportunidade nas buscas locais`, `${prospect.name}: mais contactos diretos`],
      paragraphs: [
        "Sou Felipe, desenvolvedor web na AionSite. Ajudo negócios locais a apresentar melhor os seus serviços e a facilitar o contacto.",
        `Encontrei uma oportunidade na presença digital de ${prospect.name} que pode valer a pena rever para clientes em ${prospect.city}.`,
        "Posso enviar uma proposta breve com duas ou três melhorias práticas, começando pela mais relevante.",
      ],
      cta: "Quer que eu envie?", button: "Sim, enviar",
    },
    it: {
      subjects: [`${prospect.name}: un'idea rapida per crescere`, `${prospect.name}: un miglioramento digitale`, `${prospect.name}: opportunità nelle ricerche locali`, `${prospect.name}: più contatti diretti`],
      paragraphs: [
        "Sono Felipe, sviluppatore web di AionSite. Aiuto le attività locali a presentare meglio i propri servizi e a facilitare i contatti.",
        `Ho notato un'opportunità nella presenza digitale di ${prospect.name} che potrebbe essere utile rivedere per i clienti di ${prospect.city}.`,
        "Posso condividere una proposta breve con due o tre miglioramenti pratici, iniziando da quello più rilevante.",
      ],
      cta: "Vuoi che te la invii?", button: "Sì, inviala",
    },
  } as const;
  const localized = copy[language === "es" ? "en" : language];
  const subject = localized.subjects[{ a: 0, b: 1, c: 2, d: 3 }[variant]];
  return buildMessage({ subject, greeting, paragraphs: [...localized.paragraphs], ctaText: localized.cta, ctaButtonLabel: localized.button });
}

export function buildEmail(prospect: ProspectEmailModel, variant: EmailVariant = "a") {
  if (getProspectLanguage(prospect) !== "es") return buildLocalizedEmail(prospect, variant);
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
