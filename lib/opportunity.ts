import {
  LEAD_TYPE_BAD_REVIEWS,
  LEAD_TYPE_NO_WEBSITE,
  resolveLeadType,
} from "@/lib/lead-types";
import type { ProspectCandidate } from "@/lib/types";

export function buildOpportunity(
  prospect: Pick<ProspectCandidate, "type" | "website" | "rating" | "userRatingCount">
) {
  const leadType = resolveLeadType(prospect);

  if (leadType === LEAD_TYPE_NO_WEBSITE) {
    return {
      opportunity:
        "no cuentan con un sitio propio para generar confianza y captar contactos directos",
      recommendedSite: "sitio comercial con servicios, testimonios y CTA claros",
      pitchAngle: "captar contactos directos sin depender solo de Google o redes",
    };
  }

  if (leadType === LEAD_TYPE_BAD_REVIEWS) {
    return {
      opportunity:
        "ya reciben trafico y visibilidad, pero su reputacion digital todavia deja dinero sobre la mesa",
      recommendedSite:
        "sitio de confianza con pruebas sociales, casos, FAQs y llamadas a la accion",
      pitchAngle: "convertir mejor el trafico actual mientras refuerzan confianza",
    };
  }

  return {
    opportunity:
      "su sitio actual o presencia digital se puede modernizar para transmitir mas confianza y convertir mejor",
    recommendedSite:
      "sitio redisenado con mejor estructura, velocidad, SEO local y CTA claros",
    pitchAngle: "aprovechar mejor el trafico actual con una presencia mas solida",
  };
}
