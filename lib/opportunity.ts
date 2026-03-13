import { normalizeName } from "@/lib/normalizers";
import { inferWebsiteSignal } from "@/lib/prospect-scoring";
import type { ProspectCandidate } from "@/lib/types";

export function buildOpportunity(
  prospect: Pick<ProspectCandidate, "type" | "website">
) {
  const type = normalizeName(prospect.type);
  const websiteSignal = inferWebsiteSignal({
    website: prospect.website,
  });

  if (type === "inmobiliaria") {
    return {
      opportunity:
        websiteSignal === "missing"
          ? "no tienen sitio propio para captar compradores y vendedores"
          : "su sitio actual puede captar mas leads de propiedades",
      recommendedSite: "portal inmobiliario con catalogo, filtros y formularios",
      pitchAngle: "generar mas consultas calificadas de propiedades",
    };
  }

  if (type === "restaurante") {
    return {
      opportunity:
        websiteSignal === "missing" || websiteSignal === "social-only"
          ? "dependen de Google y redes para reservas o pedidos"
          : "su sitio actual puede convertir mejor visitas en reservas",
      recommendedSite: "sitio con menu, reservas, mapa y CTA a WhatsApp",
      pitchAngle: "captar reservas directas sin depender solo de redes",
    };
  }

  if (type === "clinica") {
    return {
      opportunity:
        websiteSignal === "missing"
          ? "no tienen un sitio claro para captar citas y transmitir confianza"
          : "pueden convertir mejor las busquedas locales en citas",
      recommendedSite: "sitio medico con servicios, doctores y solicitud de citas",
      pitchAngle: "generar mas citas desde busquedas locales de alta intencion",
    };
  }

  return {
    opportunity:
      websiteSignal === "missing"
        ? "no cuentan con un sitio propio para generar confianza y contactos"
        : "su presencia digital puede modernizarse para convertir mejor",
    recommendedSite: "sitio de presentacion con servicios, testimonios y contacto",
    pitchAngle: "verse mas profesionales y captar solicitudes directas",
  };
}
