import { buildEmail } from "@/lib/email-template";
import { buildOpportunity } from "@/lib/opportunity";

export type OutreachMessageType =
  | "first_contact"
  | "followup"
  | "followup_1"
  | "followup_2"
  | "followup_3"
  | "closing";

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

function buildFollowup1Draft(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);

  return {
    subject: `${prospect.name}: recordatorio rapido sobre su sitio web`,
    message: `Hola ${addressee},

Solo queria retomar este mensaje por si se te paso.

Veo una oportunidad clara: ${context.opportunity}. Con una propuesta enfocada en ${context.pitchAngle}, se puede aterrizar algo practico y directo.

Si quieres, te comparto una estructura simple para ${context.recommendedSite}.

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

Te comparto un angulo distinto que podria tener impacto rapido.

Mas alla de verse mejor, la oportunidad esta en ${context.pitchAngle}. Si se ordena la propuesta y el contacto en un sitio pensado para conversion, se puede aprovechar mucho mejor el trafico que ya reciben.

Si te interesa, te enseño una version breve de como lo resolveria para ${prospect.name}.

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

Antes de hacerlo, te dejo la idea central: ${context.opportunity}. Normalmente esto se resuelve bien con ${context.recommendedSite} y una propuesta enfocada en ${context.pitchAngle}.

Si mas adelante quieres retomarlo, con gusto te comparto una propuesta puntual.

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
    };
  }

  if (type === "followup_2") {
    return {
      ...buildFollowup2Draft(prospect),
      type,
    };
  }

  if (type === "followup_3" || type === "closing") {
    return {
      ...buildFollowup3Draft(prospect),
      type: "followup_3" as const,
    };
  }

  return {
    ...buildFirstContactDraft(prospect),
    type,
  };
}
