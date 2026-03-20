import { buildEmail } from "@/lib/email-template";
import { buildOpportunity } from "@/lib/opportunity";

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

export function buildProspectOutreachDraft(prospect: OutreachProspect) {
  const derived = buildOpportunity({
    type: prospect.type,
    website: prospect.website,
  });
  const opportunity = prospect.opportunity || derived.opportunity;
  const email = buildEmail({
    ...prospect,
    opportunity,
    recommendedSite: prospect.recommendedSite || derived.recommendedSite,
    pitchAngle: prospect.pitchAngle || derived.pitchAngle,
  });

  const analysis = prospect.website
    ? "El prospecto ya tiene website. El borrador enfoca la conversacion en rediseño, claridad de propuesta y mejora de conversion."
    : "El prospecto no tiene website claro. El borrador enfoca la conversacion en credibilidad, presencia digital y captacion inicial de contactos.";

  return {
    subject: email.subject,
    message: email.text,
    analysis,
    opportunity,
  };
}
