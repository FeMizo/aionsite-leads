import type { Prospect } from "@/generated/prisma";

export function buildEmail(prospect: Prospect) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;

  const websiteLine = prospect.website
    ? "Revise su presencia digital y note que su sitio actual puede verse mas solido y convertir mejor."
    : "Revise su presencia digital y note que todavia no cuentan con un sitio propio claro para presentar el negocio.";

  const ratingLine = prospect.rating
    ? `Tambien vi que tienen una calificacion de ${prospect.rating}, lo cual es una buena base para aprovechar mejor su visibilidad online.`
    : "";

  const typeLine = prospect.type
    ? `En negocios como ${prospect.type.toLowerCase()}, una web bien hecha ayuda mucho a ${
        prospect.pitchAngle || "atraer mas clientes"
      }.`
    : "";

  const recommendationLine = prospect.recommendedSite
    ? `Para ustedes tendria sentido un ${prospect.recommendedSite}.`
    : "";

  const subject = `Idea rapida para ${prospect.name}`;

  const text = `${greeting}

Estaba revisando negocios locales en Google y encontre ${prospect.name} en ${
    prospect.city || "su zona"
  }.

${websiteLine}
${ratingLine}
${typeLine}

En su caso veo una oportunidad clara porque ${prospect.opportunity}.

${recommendationLine}

En Aionsite desarrollamos sitios web modernos para negocios locales en Mexico, enfocados en transmitir confianza, cargar rapido y generar mas contactos.

Si quieren, puedo compartirles una propuesta visual rapida sin costo para mostrarles como podria verse su sitio.

Les interesaria?

Saludos,
Felipe
Aionsite
contacto@aionsite.com.mx`;

  return { subject, text };
}
