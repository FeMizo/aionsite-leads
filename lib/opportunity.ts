import {
  LEAD_TYPE_BAD_REVIEWS,
  LEAD_TYPE_NO_WEBSITE,
  resolveLeadType,
} from "@/lib/lead-types";
import { getProspectSignalCounts, hasPoorWebsite } from "@/lib/prospect-scoring";
import type { ProspectCandidate } from "@/lib/types";

export function buildOpportunity(
  prospect: Pick<
    ProspectCandidate,
    | "type"
    | "website"
    | "rating"
    | "userRatingCount"
    | "websiteFetchFailed"
    | "websiteLoadTimeMs"
    | "hasWhatsappCta"
    | "hasContactCta"
    | "isMobileFriendly"
  >
) {
  const leadType = resolveLeadType(prospect);
  const signals = getProspectSignalCounts(prospect);

  if (leadType === LEAD_TYPE_NO_WEBSITE) {
    return {
      opportunity: "no tienen un sitio web propio para captar clientes de forma directa",
      recommendedSite: "sitio comercial con CTA claros, WhatsApp y formulario visible",
      pitchAngle: "captar contactos directos sin perder trafico en Google o redes",
    };
  }

  if (prospect.websiteFetchFailed) {
    return {
      opportunity: "su sitio actual no esta cargando bien y eso rompe conversion desde el primer click",
      recommendedSite: "sitio ligero, estable y pensado para conversion desde celular",
      pitchAngle: "evitar fugas por una web que hoy no responde como deberia",
    };
  }

  if (
    typeof prospect.websiteLoadTimeMs === "number" &&
    prospect.websiteLoadTimeMs >= 4500
  ) {
    return {
      opportunity: "su sitio carga lento y eso hace que parte del trafico se enfrie antes de contactar",
      recommendedSite: "sitio rapido con CTA visibles y estructura enfocada en leads",
      pitchAngle: "recuperar contactos que hoy se pierden por velocidad",
    };
  }

  if (signals.noCta) {
    return {
      opportunity: "su sitio no deja claro como escribirles por WhatsApp o pedir informacion",
      recommendedSite: "sitio con botones de contacto, WhatsApp y formularios visibles",
      pitchAngle: "convertir visitas en conversaciones reales con menos friccion",
    };
  }

  if (signals.notMobileFriendly) {
    return {
      opportunity: "su sitio no esta bien resuelto para celular y eso frena conversion en trafico local",
      recommendedSite: "sitio responsive con enfoque movil y CTA claros",
      pitchAngle: "mejorar conversion desde movil, donde llega la mayor parte del trafico local",
    };
  }

  if (leadType === LEAD_TYPE_BAD_REVIEWS) {
    return {
      opportunity: "ya reciben clientes y reseñas, pero su presencia digital todavia puede convertir mejor",
      recommendedSite: "sitio de confianza con pruebas sociales, FAQs y llamadas a la accion",
      pitchAngle: "capitalizar mejor el trafico que ya existe sin depender solo de reputacion",
    };
  }

  if (signals.goodReviewsBadPresence) {
    return {
      opportunity: "tienen buenas reseñas, pero su presencia digital todavia se queda corta frente a ese nivel de reputacion",
      recommendedSite: "sitio actualizado con mejor estructura, confianza y conversion",
      pitchAngle: "aprovechar mejor la reputacion que ya construyeron",
    };
  }

  if (hasPoorWebsite(prospect)) {
    return {
      opportunity: "su sitio actual se percibe viejo o poco claro para convertir visitas en clientes",
      recommendedSite: "sitio redisenado con mejor estructura, velocidad y CTA claros",
      pitchAngle: "aprovechar mejor el trafico actual con una web que convierta",
    };
  }

  return {
    opportunity: "su presencia digital actual puede ordenarse mejor para generar mas contactos",
    recommendedSite: "sitio enfocado en conversion, SEO local y contacto visible",
    pitchAngle: "atraer mas clientes sin depender solo de publicidad",
  };
}
