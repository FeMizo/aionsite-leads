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
      ? "El prospecto no tiene sitio propio. El enfoque debe ir a presencia digital, confianza y captacion de contactos."
      : leadType === LEAD_TYPE_BAD_REVIEWS
        ? "El prospecto ya tiene trafico y reputacion que se puede potenciar. El enfoque debe ir a confianza, pruebas sociales y conversion."
        : "El prospecto ya tiene presencia digital, y hay margen para afinar oferta, claridad y conversion.";

  return {
    opportunity,
    recommendedSite,
    pitchAngle,
    analysis,
  };
}

function pickFirstContactVariant(prospect: OutreachProspect): OutreachScriptVariant {
  // Semilla que incluye reseñas para mas variedad entre leads similares
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
    a: "angulo directo sobre trafico perdido por nicho y ciudad.",
    b: "angulo suave, centrado en potencial local sin hablar de ads.",
    c: "angulo de oportunidad especifica detectada en Google.",
    d: "angulo de potencial propio sin explotar.",
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
    subject: `${prospect.name}: queria asegurarme que llego el mensaje`,
    message: `Hola ${addressee},

Solo queria asegurarme de que llego el mensaje anterior.

Lo que encontre en ${prospect.name}${cityLine} es algo puntual: ${context.opportunity}.

Es una oportunidad concreta. Con ${context.pitchAngle} se mejora sin complicar.

Le grabo el video de 2 minutos?

Saludos,
AionSite`,
    html: null,
    analysis: "Follow-up 1: recordatorio directo reenmarcando como oportunidad.",
    opportunity: context.opportunity,
  };
}

function buildFollowup2Draft(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);
  const stars = parseFloat(prospect.rating || "0");
  const hasRating = stars >= 4.0 && typeof prospect.userRatingCount === "number" && prospect.userRatingCount >= 10;
  const reviewLine = hasRating
    ? `${prospect.name} tiene ${stars} estrellas y ${prospect.userRatingCount} reseñas. Eso es un activo real que todavia no esta generando todo lo que podria.`
    : typeof prospect.userRatingCount === "number" && prospect.userRatingCount >= 10
      ? `Con ${prospect.userRatingCount} reseñas en Google ya tienen traccion. La oportunidad esta en convertir ese trafico en contactos.`
      : "Ya tienen presencia en Google. El siguiente paso es que esa visibilidad se traduzca en contactos directos.";

  return {
    subject: `${prospect.name}: un punto que no habia mencionado`,
    message: `Hola ${addressee},

Le comparto un angulo diferente al del mensaje anterior.

${reviewLine}

La clave no es verse mejor, es que quien los encuentra los contacte. Eso es lo que ${context.pitchAngle} resuelve directamente.

Le muestro como en 2 minutos?

Saludos,
AionSite`,
    html: null,
    analysis: "Follow-up 2: nuevo angulo con rating y reseñas como prueba social, enfoque en conversion.",
    opportunity: context.opportunity,
  };
}

function buildFollowup3Draft(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);

  return {
    subject: `${prospect.name}: una idea final para seguir creciendo`,
    message: `Hola ${addressee},

Le dejo una idea final por si les sirve.

Les dejo la idea en una linea: ${context.opportunity}. La solucion mas directa para ${prospect.name} seria ${context.recommendedSite}, enfocada en ${context.pitchAngle}.

Si en algun momento les interesa retomarlo, aqui estamos.

Que les vaya bien,
AionSite`,
    html: null,
    analysis: "Follow-up 3: cierre firme y elegante con solucion concreta y puerta abierta.",
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
