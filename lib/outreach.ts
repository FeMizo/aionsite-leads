import { buildEmail, getProspectLanguage } from "@/lib/email-template";
import {
  LEAD_TYPE_BAD_REVIEWS,
  LEAD_TYPE_NO_WEBSITE,
  resolveLeadType,
} from "@/lib/lead-types";
import { buildOpportunity } from "@/lib/opportunity";

const SERVICES_CANVA_URL = "https://canva.link/uk8xoudaah19yry";

function withServicesLink(message: string) {
  return `${message}\n\nPuedes ver nuestros servicios de forma visual aquí: ${SERVICES_CANVA_URL}`;
}

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
  languageCode?: string;
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
      ? "El prospecto no tiene sitio propio. Enfoque: presencia digital, confianza y captación de contactos."
      : leadType === LEAD_TYPE_BAD_REVIEWS
        ? "El prospecto tiene tráfico y reputación que se puede potenciar. Enfoque: confianza y conversión."
        : "El prospecto ya tiene presencia digital. Enfoque: claridad, oferta y conversión.";

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
    a: "ángulo directo sobre tráfico por nicho y ciudad.",
    b: "ángulo suave, centrado en potencial local.",
    c: "ángulo de oportunidad detectada en Google.",
    d: "ángulo de potencial propio.",
  };
  const email = buildEmail(
    {
      ...prospect,
      languageCode: prospect.languageCode || "es",
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
    subject: `${prospect.name}: ¿viste mi mensaje?`,
    message: withServicesLink(`Hola ${addressee},

Solo quería confirmar si viste mi mensaje anterior.

Soy Felipe, desarrollador web en AionSite. Puedo ayudarte a revisar cómo presentar con claridad sus servicios y facilitar el contacto.

La oportunidad que te mencioné para ${prospect.name}${cityLine} es: ${context.opportunity}. Cualquier resultado dependerá de cómo respondan las personas visitantes.

Si aún te interesa, puedo enviarte una propuesta breve con el primer ajuste que evaluaría.

Saludos,
AionSite`),
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
    ? `${prospect.name} tiene ${stars} estrellas y ${prospect.userRatingCount} reseñas. Esa reputación puede aprovecharse mejor si el sitio facilita el siguiente paso.`
    : typeof prospect.userRatingCount === "number" && prospect.userRatingCount >= 10
      ? `Con ${prospect.userRatingCount} reseñas en Google ya existe una base de confianza. El sitio puede ayudar a explicar cómo solicitar información.`
      : "Su presencia en Google ya facilita que las personas encuentren el negocio. El sitio puede ayudarles a entender la oferta y cómo contactar.";

  return {
    subject: `${prospect.name}: otro punto breve`,
    message: withServicesLink(`Hola ${addressee},

${reviewLine}

¿Te gustaría que te enviara una propuesta breve con el primer ajuste que evaluaría?

Saludos,
AionSite`),
    html: null,
    analysis: "Follow-up 2: ángulo breve con prueba social.",
    opportunity: context.opportunity,
  };
}

function buildFollowup3Draft(prospect: OutreachProspect) {
  const context = getOpportunityContext(prospect);
  const addressee = getGreeting(prospect.name, prospect.contactName);

  return {
    subject: `${prospect.name}: idea final`,
    message: withServicesLink(`Hola ${addressee},

Te dejo una idea final por si sirve.

En una línea: ${context.opportunity}. La mejora más directa sería ${context.recommendedSite}.

Si en algún momento te interesa verlo, aquí estoy.

Que les vaya bien,
AionSite`),
    html: null,
    analysis: "Follow-up 3: cierre breve y amable.",
    opportunity: context.opportunity,
  };
}

function buildLocalizedFollowupDraft(prospect: OutreachProspect, type: OutreachMessageType) {
  const language = getProspectLanguage({ languageCode: prospect.languageCode || "es", city: prospect.city });
  const name = getGreeting(prospect.name, prospect.contactName);
  const content = {
    en: {
      one: { subject: `${prospect.name}: following up`, body: `Hello ${name},\n\nJust checking whether you had a chance to see my previous message. I can send a short proposal with the first improvement I would review.\n\nBest,\nAionSite` },
      two: { subject: `${prospect.name}: one more quick idea`, body: `Hello ${name},\n\nYour local presence already gives people a way to find you. A clearer next step could make enquiries easier. Would you like me to send a brief proposal?\n\nBest,\nAionSite` },
      three: { subject: `${prospect.name}: final note`, body: `Hello ${name},\n\nI’ll leave you with one final idea: make the main service and contact option easier to find. If it becomes useful, I’d be happy to share the details.\n\nBest,\nAionSite` },
    },
    pt: {
      one: { subject: `${prospect.name}: breve acompanhamento`, body: `Olá ${name},\n\nQueria confirmar se teve oportunidade de ver a minha mensagem anterior. Posso enviar uma proposta breve com a primeira melhoria que avaliaria.\n\nCumprimentos,\nAionSite` },
      two: { subject: `${prospect.name}: mais uma ideia breve`, body: `Olá ${name},\n\nA presença local já ajuda as pessoas a encontrar o negócio. Um próximo passo mais claro pode facilitar os contactos. Quer que eu envie uma proposta breve?\n\nCumprimentos,\nAionSite` },
      three: { subject: `${prospect.name}: última nota`, body: `Olá ${name},\n\nDeixo uma última ideia: tornar o serviço principal e a forma de contacto mais fáceis de encontrar. Se for útil, posso partilhar os detalhes.\n\nCumprimentos,\nAionSite` },
    },
    it: {
      one: { subject: `${prospect.name}: breve seguito`, body: `Ciao ${name},\n\nVolevo sapere se hai avuto modo di leggere il mio messaggio precedente. Posso inviare una breve proposta con il primo miglioramento che valuterei.\n\nUn saluto,\nAionSite` },
      two: { subject: `${prospect.name}: un'altra idea breve`, body: `Ciao ${name},\n\nLa presenza locale aiuta già le persone a trovarti. Un passaggio più chiaro potrebbe facilitare i contatti. Vuoi che invii una breve proposta?\n\nUn saluto,\nAionSite` },
      three: { subject: `${prospect.name}: ultima nota`, body: `Ciao ${name},\n\nLascio un'ultima idea: rendere più facile trovare il servizio principale e il contatto. Se sarà utile, sarò felice di condividere i dettagli.\n\nUn saluto,\nAionSite` },
    },
  } as const;
  const group = content[language === "es" ? "en" : language];
  const key = type === "followup_2" ? "two" : type === "followup_3" || type === "closing" ? "three" : "one";
  return { subject: group[key].subject, message: group[key].body, html: null, analysis: `Follow-up automático en idioma ${language}.`, opportunity: prospect.opportunity };
}

export function buildProspectOutreachDraft(
  prospect: OutreachProspect,
  type: OutreachMessageType = "first_contact"
) {
  if (getProspectLanguage({ languageCode: prospect.languageCode || "es", city: prospect.city }) !== "es") {
    const localizedType = type === "first_contact" ? "first_contact" : type;
    if (localizedType !== "first_contact") return { ...buildLocalizedFollowupDraft(prospect, localizedType), type: localizedType === "closing" ? "followup_3" as const : localizedType, scriptVariant: null };
  }
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
