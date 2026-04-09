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
        ? "El prospecto ya tiene trafico y reputacion mejorable. El enfoque debe ir a confianza, pruebas sociales y conversion."
        : "El prospecto ya tiene presencia digital, pero requiere rediseno, claridad de oferta y mejor conversion.";

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
    d: "angulo comparativo con lo que hace la competencia.",
  };
  const email = buildEmail(
    {
      ...prospect,
      opportunity: context.opportunity,
      recommendedSite: context.recommendedSite,
      pitchAngle: context.pitchAngle,
    },
    variant
  );

  return {
    subject: email.subject,
    message: email.text,
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
    subject: `${prospect.name}: por si se perdio el mensaje anterior`,
    message: `Hola ${addressee},

Solo retomo el mensaje anterior por si se perdio.

Lo que vi en ${prospect.name}${cityLine} es concreto: ${context.opportunity}.

Con una solucion enfocada en ${context.pitchAngle} se puede atacar eso sin complicar demasiado.

Si quiere lo platicamos rapido, le mando el video?

Saludos,
AionSite`,
    analysis: "Follow-up 1: recordatorio con ciudad y problema especifico para recuperar atencion.",
    opportunity: context.opportunity,
  };
}

function buildFollowup2Draft(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);
  const reviewLine =
    typeof prospect.userRatingCount === "number" && prospect.userRatingCount >= 10
      ? `Con sus ${prospect.userRatingCount} reseñas ya tienen un activo real.`
      : "Ya tienen clientes activos.";

  return {
    subject: `${prospect.name}: le comparto un angulo distinto`,
    message: `Hola ${addressee},

Le comparto un angulo diferente al del mensaje anterior.

${reviewLine} El punto no es solo verse mejor sino ${context.pitchAngle}.

Si se resuelve eso bien, el trafico que ya reciben convierte mucho mejor sin necesidad de mas publicidad.

Le explico en 2 minutos como lo resolveria para ${prospect.name}?

Saludos,
AionSite`,
    analysis: "Follow-up 2: nuevo angulo con reseñas como prueba social y enfoque en conversion.",
    opportunity: context.opportunity,
  };
}

function buildFollowup3Draft(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);

  return {
    subject: `${prospect.name}: cierro este hilo por ahora`,
    message: `Hola ${addressee},

Cierro este hilo para no insistir demasiado.

Antes de hacerlo le dejo la idea central: ${context.opportunity}. Normalmente se resuelve con ${context.recommendedSite} y una propuesta enfocada en ${context.pitchAngle}.

Si en algun momento quieren retomarlo, estamos.

Saludos,
AionSite`,
    analysis: "Follow-up 3: cierre elegante con idea central clara y puerta abierta.",
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
