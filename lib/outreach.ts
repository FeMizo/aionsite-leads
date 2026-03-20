import { buildEmail } from "@/lib/email-template";
import { buildOpportunity } from "@/lib/opportunity";

export type OutreachMessageType = "first_contact" | "followup" | "closing";

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

function getGreeting(name: string, contactName: string) {
  return contactName || name || "equipo";
}

function getOpportunityContext(prospect: OutreachProspect) {
  const derived = buildOpportunity({
    type: prospect.type,
    website: prospect.website,
  });
  const opportunity = prospect.opportunity || derived.opportunity;
  const recommendedSite = prospect.recommendedSite || derived.recommendedSite;
  const pitchAngle = prospect.pitchAngle || derived.pitchAngle;
  const analysis = prospect.website
    ? "El prospecto ya tiene website. El enfoque debe ir a rediseno, claridad de oferta y conversion."
    : "El prospecto no tiene website claro. El enfoque debe ir a presencia digital, confianza y captacion de contactos.";

  return {
    opportunity,
    recommendedSite,
    pitchAngle,
    analysis,
  };
}

function buildFirstContactDraft(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const email = buildEmail({
    ...prospect,
    opportunity: context.opportunity,
    recommendedSite: context.recommendedSite,
    pitchAngle: context.pitchAngle,
  });

  return {
    subject: email.subject,
    message: email.text,
    analysis: context.analysis,
    opportunity: context.opportunity,
  };
}

function buildFollowupDraft(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);
  const subject = `${prospect.name}: seguimiento rapido sobre su presencia web`;
  const message = `Hola ${addressee},

Te escribo de nuevo porque vi una oportunidad clara para ${prospect.website ? "mejorar" : "crear"} su presencia digital.

Detecte que ${context.opportunity}. Con una propuesta enfocada en ${context.pitchAngle}, se puede tener un sitio mas claro y orientado a conversion.

Si te hace sentido, te comparto una idea concreta de estructura para ${context.recommendedSite}.

Saludos,
AionSite`;

  return {
    subject,
    message,
    analysis:
      "Seguimiento corto para retomar conversacion y llevar al prospecto a una siguiente respuesta.",
    opportunity: context.opportunity,
  };
}

function buildClosingDraft(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);
  const subject = `${prospect.name}: cierro este hilo por ahora`;
  const message = `Hola ${addressee},

Cierro este hilo por ahora para no insistir de mas.

Antes de hacerlo, te dejo la idea central: ${context.opportunity}. Esto normalmente se resuelve bien con ${context.recommendedSite} y una propuesta enfocada en ${context.pitchAngle}.

Si en otro momento quieres retomarlo, con gusto te comparto una propuesta puntual.

Saludos,
AionSite`;

  return {
    subject,
    message,
    analysis: "Mensaje de cierre amable para dejar abierta la puerta sin seguir presionando.",
    opportunity: context.opportunity,
  };
}

export function buildProspectOutreachDraft(
  prospect: OutreachProspect,
  type: OutreachMessageType = "first_contact"
) {
  if (type === "followup") {
    return {
      ...buildFollowupDraft(prospect),
      type,
    };
  }

  if (type === "closing") {
    return {
      ...buildClosingDraft(prospect),
      type,
    };
  }

  return {
    ...buildFirstContactDraft(prospect),
    type,
  };
}
