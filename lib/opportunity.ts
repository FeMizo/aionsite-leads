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
      pitchAngle: "captar contactos directos sin perder tráfico en Google o redes",
    };
  }

  if (prospect.websiteFetchFailed) {
    return {
      opportunity: "su sitio actual no está cargando bien y eso rompe conversión desde el primer clic",
      recommendedSite: "sitio ligero, estable y pensado para conversión desde celular",
      pitchAngle: "evitar fugas por una web que hoy no responde como debería",
    };
  }

  if (
    typeof prospect.websiteLoadTimeMs === "number" &&
    prospect.websiteLoadTimeMs >= 4500
  ) {
    return {
      opportunity: "su sitio carga lento y eso hace que parte del tráfico se enfríe antes de contactar",
      recommendedSite: "sitio rápido con CTA visibles y estructura enfocada en leads",
      pitchAngle: "recuperar contactos que hoy se pierden por velocidad",
    };
  }

  if (signals.noCta) {
    return {
      opportunity: "su sitio no deja claro cómo escribirles por WhatsApp o pedir información",
      recommendedSite: "sitio con botones de contacto, WhatsApp y formularios visibles",
      pitchAngle: "convertir visitas en conversaciones reales con menos fricción",
    };
  }

  if (signals.notMobileFriendly) {
    return {
      opportunity: "su sitio no está bien resuelto para celular y eso frena conversión en tráfico local",
      recommendedSite: "sitio responsive con enfoque móvil y CTA claros",
      pitchAngle: "mejorar conversión desde móvil, donde llega la mayor parte del tráfico local",
    };
  }

  if (leadType === LEAD_TYPE_BAD_REVIEWS) {
    return {
      opportunity: "ya reciben clientes y reseñas, pero su presencia digital todavía puede convertir mejor",
      recommendedSite: "sitio de confianza con pruebas sociales, FAQs y llamadas a la acción",
      pitchAngle: "capitalizar mejor el tráfico que ya existe sin depender solo de reputación",
    };
  }

  if (signals.goodReviewsBadPresence) {
    return {
      opportunity: "tienen buenas reseñas, pero su presencia digital todavía se queda corta frente a ese nivel de reputación",
      recommendedSite: "sitio actualizado con mejor estructura, confianza y conversión",
      pitchAngle: "aprovechar mejor la reputación que ya construyeron",
    };
  }

  if (hasPoorWebsite(prospect)) {
    return {
      opportunity: "su sitio actual se percibe viejo o poco claro para convertir visitas en clientes",
      recommendedSite: "sitio rediseñado con mejor estructura, velocidad y CTA claros",
      pitchAngle: "aprovechar mejor el tráfico actual con una web que convierta",
    };
  }

  return {
    opportunity: "su presencia digital actual puede ordenarse mejor para generar más contactos",
    recommendedSite: "sitio enfocado en conversión, SEO local y contacto visible",
    pitchAngle: "atraer más clientes sin depender solo de publicidad",
  };
}
