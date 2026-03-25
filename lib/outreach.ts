import { buildEmail } from "@/lib/email-template";
import { buildOpportunity } from "@/lib/opportunity";

export type OutreachMessageType =
  | "first_contact"
  | "followup"
  | "followup_1"
  | "followup_2"
  | "followup_3"
  | "closing";

export type OutreachScriptVariant = "a" | "b" | "c";

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

const FIRST_CONTACT_VARIANTS = ["a", "b", "c"] as const satisfies readonly OutreachScriptVariant[];

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
  const email = buildEmail({
    ...prospect,
    opportunity: context.opportunity,
    recommendedSite: context.recommendedSite,
    pitchAngle: context.pitchAngle,
  });

  return {
    subject: email.subject,
    message: email.text,
    analysis: `${context.analysis} Script A: diagnostico rapido y propuesta sin costo.`,
    opportunity: context.opportunity,
    scriptVariant: "a" as const,
  };
}

function buildFirstContactScriptB(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);

  return {
    subject: `${prospect.name}: una idea puntual para captar mas clientes`,
    message: `Hola ${addressee},

Revise ${prospect.name} y vi una oportunidad puntual: ${context.opportunity}.

Cuando un negocio como el suyo mejora su presencia digital y ordena mejor su oferta, suele ser mas facil convertir visitas en conversaciones reales.

Si le hace sentido, puedo compartirle una propuesta breve para ${context.recommendedSite}, enfocada en ${context.pitchAngle}.

Si quiere verla, se la mando sin costo.

Saludos,
AionSite`,
    analysis:
      "Script B: mensaje mas corto, orientado a oportunidad concreta y llamada a la accion simple.",
    opportunity: context.opportunity,
    scriptVariant: "b" as const,
  };
}

function buildFirstContactScriptC(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);

  return {
    subject: `${prospect.name}: propuesta rapida para su presencia digital`,
    message: `Hola ${addressee},

Le escribo porque al revisar ${prospect.name} detecte que hay espacio para mejorar ${context.pitchAngle}.

No lo veo como un tema de "tener o no tener sitio", sino de usar mejor su presencia digital para transmitir confianza y facilitar el contacto.

En su caso, lo resolveria con ${context.recommendedSite} y una estructura muy clara alrededor de esta idea: ${context.opportunity}.

Si quiere, le comparto un ejemplo visual rapido para que vea por donde lo llevaria.

Saludos,
AionSite`,
    analysis:
      "Script C: angulo consultivo, menos comercial y mas centrado en claridad de oferta.",
    opportunity: context.opportunity,
    scriptVariant: "c" as const,
  };
}

function buildFirstContactDraft(prospect: OutreachProspect) {
  const variant = pickFirstContactVariant(prospect);

  if (variant === "b") {
    return buildFirstContactScriptB(prospect);
  }

  if (variant === "c") {
    return buildFirstContactScriptC(prospect);
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
