import { buildEmail } from "@/lib/email-template";
import {
  LEAD_TYPE_BAD_REVIEWS,
  LEAD_TYPE_NO_WEBSITE,
  resolveLeadType,
} from "@/lib/lead-types";
import { buildOpportunity } from "@/lib/opportunity";

export type OutreachMessageType =
  | "first_contact"
  | "followup"
  | "followup_1"
  | "followup_2"
  | "followup_3"
  | "closing";

export type OutreachScriptVariant = "a" | "b" | "c" | "d";

type OutreachProspect = {
  name: string;
  contactName: string;
  city: string;
  email: string;
  type: string;
  website: string;
  rating: string;
  userRatingCount?: number | null;
  opportunity: string;
  recommendedSite: string;
  pitchAngle: string;
  primaryType?: string | null;
};

const FIRST_CONTACT_VARIANTS = ["a", "b", "c", "d"] as const satisfies readonly OutreachScriptVariant[];

function getGreeting(name: string, contactName: string) {
  return contactName || name || "equipo";
}

function getOpportunityContext(prospect: OutreachProspect) {
  const leadType = resolveLeadType({
    type: prospect.type,
    website: prospect.website,
    rating: prospect.rating,
  });
  const derived = buildOpportunity({
    type: prospect.type,
    website: prospect.website,
    rating: prospect.rating,
    userRatingCount: prospect.userRatingCount ?? null,
  });
  const opportunity = prospect.opportunity || derived.opportunity;
  const recommendedSite = prospect.recommendedSite || derived.recommendedSite;
  const pitchAngle = prospect.pitchAngle || derived.pitchAngle;
  const analysis =
    leadType === LEAD_TYPE_NO_WEBSITE
      ? "El prospecto no tiene sitio propio. Enfoque: presencia digital, confianza y captacion de contactos."
      : leadType === LEAD_TYPE_BAD_REVIEWS
        ? "El prospecto tiene trafico y reputacion que se puede potenciar. Enfoque: confianza y conversion."
        : "El prospecto ya tiene presencia digital. Enfoque: claridad, oferta y conversion.";

  return {
    opportunity,
    recommendedSite,
    pitchAngle,
    analysis,
  };
}

function pickFirstContactVariant(prospect: OutreachProspect): OutreachScriptVariant {
  const seed = `${prospect.name}|${prospect.city}|${prospect.email}|${prospect.type}|${prospect.userRatingCount ?? 0}`;
  let total = 0;

  for (const character of seed) {
    total += character.charCodeAt(0);
  }

  return FIRST_CONTACT_VARIANTS[total % FIRST_CONTACT_VARIANTS.length];
}

function buildFirstContactScript(prospect: OutreachProspect, variant: OutreachScriptVariant) {
  const context = getOpportunityContext(prospect);
  const analysisLabels: Record<OutreachScriptVariant, string> = {
    a: "angulo directo sobre trafico por nicho y ciudad.",
    b: "angulo suave, centrado en potencial local.",
    c: "angulo de oportunidad detectada en Google.",
    d: "angulo de potencial propio.",
  };
  const email = buildEmail(
    {
      ...prospect,
      opportunity: context.opportunity,
      recommendedSite: context.recommendedSite,
      pitchAngle: context.pitchAngle,
      primaryType: prospect.primaryType ?? null,
    },
    variant
  );

  return {
    subject: email.subject,
    message: email.text,
    html: email.html,
    analysis: `${context.analysis} Variante ${variant.toUpperCase()}: ${analysisLabels[variant]}`,
    opportunity: context.opportunity,
    scriptVariant: variant,
  };
}

function buildFirstContactDraft(prospect: OutreachProspect) {
  const variant = pickFirstContactVariant(prospect);
  return buildFirstContactScript(prospect, variant);
}

function buildFollowup1Draft(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);
  const cityLine = prospect.city ? ` en ${prospect.city}` : "";

  return {
    subject: `${prospect.name}: viste mi mensaje?`,
    message: `Hola ${addressee},

Solo queria confirmar si viste mi mensaje anterior.

Vi una oportunidad puntual para ${prospect.name}${cityLine}: ${context.opportunity}.

Te mando un video corto con la idea?

Saludos,
AionSite`,
    html: null,
    analysis: "Follow-up 1: recordatorio breve y amable.",
    opportunity: context.opportunity,
  };
}

function buildFollowup2Draft(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);
  const stars = parseFloat(prospect.rating || "0");
  const hasRating =
    stars >= 4.0 &&
    typeof prospect.userRatingCount === "number" &&
    prospect.userRatingCount >= 10;
  const reviewLine = hasRating
    ? `${prospect.name} tiene ${stars} estrellas y ${prospect.userRatingCount} resenas; es buena base para generar mas contactos.`
    : typeof prospect.userRatingCount === "number" && prospect.userRatingCount >= 10
      ? `Con ${prospect.userRatingCount} resenas en Google ya tienen traccion. La oportunidad esta en convertirla en contactos.`
      : "Ya tienen presencia en Google. El siguiente paso es que esa visibilidad genere contactos.";

  return {
    subject: `${prospect.name}: otro punto breve`,
    message: `Hola ${addressee},

${reviewLine}

Te muestro en un video corto que ajustaria primero?

Saludos,
AionSite`,
    html: null,
    analysis: "Follow-up 2: angulo breve con prueba social.",
    opportunity: context.opportunity,
  };
}

function buildFollowup3Draft(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);

  return {
    subject: `${prospect.name}: idea final`,
    message: `Hola ${addressee},

Te dejo una idea final por si sirve.

En una linea: ${context.opportunity}. La mejora mas directa seria ${context.recommendedSite}.

Si en algun momento te interesa verlo, aqui estoy.

Que les vaya bien,
AionSite`,
    html: null,
    analysis: "Follow-up 3: cierre breve y amable.",
    opportunity: context.opportunity,
  };
}

export function buildProspectOutreachDraft(
  prospect: OutreachProspect,
  type: OutreachMessageType = "first_contact"
) {
  if (type === "followup" || type === "followup_1") {
    return {
      ...buildFollowup1Draft(prospect),
      type: "followup_1" as const,
      scriptVariant: null,
    };
  }

  if (type === "followup_2") {
    return {
      ...buildFollowup2Draft(prospect),
      type,
      scriptVariant: null,
    };
  }

  if (type === "followup_3" || type === "closing") {
    return {
      ...buildFollowup3Draft(prospect),
      type: "followup_3" as const,
      scriptVariant: null,
    };
  }

  return {
    ...buildFirstContactDraft(prospect),
    type,
  };
}
