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

export type OutreachScriptVariant = "a" | "b";

type OutreachProspect = {
  name: string;
  contactName: string;
  city: string;
  email: string;
  type: string;
  website: string;
  rating: string;
  opportunity: string;
  recommendedSite: string;
  pitchAngle: string;
};

const FIRST_CONTACT_VARIANTS = ["a", "b"] as const satisfies readonly OutreachScriptVariant[];

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
    userRatingCount: null,
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
  const seed = `${prospect.name}|${prospect.city}|${prospect.email}|${prospect.type}`;
  let total = 0;

  for (const character of seed) {
    total += character.charCodeAt(0);
  }

  return FIRST_CONTACT_VARIANTS[total % FIRST_CONTACT_VARIANTS.length];
}

function buildFirstContactScriptA(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const email = buildEmail(
    {
      ...prospect,
      opportunity: context.opportunity,
      recommendedSite: context.recommendedSite,
      pitchAngle: context.pitchAngle,
    },
    "a"
  );

  return {
    subject: email.subject,
    message: email.text,
    analysis: `${context.analysis} Script A/B: angulo directo sobre trafico perdido.`,
    opportunity: context.opportunity,
    scriptVariant: "a" as const,
  };
}

function buildFirstContactScriptB(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const email = buildEmail(
    {
      ...prospect,
      opportunity: context.opportunity,
      recommendedSite: context.recommendedSite,
      pitchAngle: context.pitchAngle,
    },
    "b"
  );

  return {
    subject: email.subject,
    message: email.text,
    analysis: `${context.analysis} Script A/B: angulo mas suave, centrado en potencial sin hablar de ads.`,
    opportunity: context.opportunity,
    scriptVariant: "b" as const,
  };
}

function buildFirstContactDraft(prospect: OutreachProspect) {
  const variant = pickFirstContactVariant(prospect);

  if (variant === "b") {
    return buildFirstContactScriptB(prospect);
  }

  return buildFirstContactScriptA(prospect);
}

function buildFollowup1Draft(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);

  return {
    subject: `${prospect.name}: recordatorio rapido sobre su sitio web`,
    message: `Hola ${addressee},

Solo queria retomar este mensaje por si se le paso.

Veo una oportunidad clara: ${context.opportunity}. Con una propuesta enfocada en ${context.pitchAngle}, se puede aterrizar algo practico y directo.

Si quiere, le comparto una estructura simple para ${context.recommendedSite}.

Saludos,
AionSite`,
    analysis: "Follow-up 1 con recordatorio suave para recuperar atencion sin cambiar demasiado el angulo.",
    opportunity: context.opportunity,
  };
}

function buildFollowup2Draft(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);

  return {
    subject: `${prospect.name}: otra idea para mejorar conversion`,
    message: `Hola ${addressee},

Le comparto un angulo distinto que podria tener impacto rapido.

Mas alla de verse mejor, la oportunidad esta en ${context.pitchAngle}. Si se ordena la propuesta y el contacto en un sitio pensado para conversion, se puede aprovechar mucho mejor el trafico que ya reciben.

Si le interesa, le enseno una version breve de como lo resolveria para ${prospect.name}.

Saludos,
AionSite`,
    analysis: "Follow-up 2 con nuevo angulo, enfocado menos en presencia y mas en conversion y resultado comercial.",
    opportunity: context.opportunity,
  };
}

function buildFollowup3Draft(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);

  return {
    subject: `${prospect.name}: cierro este hilo por ahora`,
    message: `Hola ${addressee},

Cierro este hilo por ahora para no insistir demasiado.

Antes de hacerlo, le dejo la idea central: ${context.opportunity}. Normalmente esto se resuelve bien con ${context.recommendedSite} y una propuesta enfocada en ${context.pitchAngle}.

Si mas adelante quiere retomarlo, con gusto le comparto una propuesta puntual.

Saludos,
AionSite`,
    analysis: "Follow-up 3 de cierre elegante para terminar la secuencia sin presion y dejar la puerta abierta.",
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
