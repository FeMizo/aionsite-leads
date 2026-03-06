function buildEmail(prospect) {
  const greeting = prospect.contactName
    ? `Hola ${prospect.contactName},`
    : `Hola equipo de ${prospect.name},`;

  const websiteLine = prospect.website
    ? `También vi que su sitio actual podría mejorarse para verse más moderno y convertir mejor.`
    : `Noté que no cuentan con un sitio web claro para mostrar su negocio y generar más confianza.`;

  const ratingLine = prospect.rating
    ? `Además, vi que tienen una calificación de ${prospect.rating} en Google, lo cual es una muy buena base para aprovechar mejor su presencia online.`
    : "";

  const typeLine = prospect.type
    ? `En negocios como ${prospect.type.toLowerCase()}, una web bien hecha ayuda mucho a ${prospect.pitchAngle || "atraer más clientes"}.`
    : "";

  const recommendationLine = prospect.recommendedSite
    ? `Una opción ideal para ustedes sería un ${prospect.recommendedSite}.`
    : "";

  const subject = `Idea rápida para ${prospect.name}`;

  const text = `${greeting}

Estaba revisando negocios en Google Maps y encontré ${prospect.name} en ${prospect.city || "su zona"}.

${websiteLine}
${ratingLine}
${typeLine}

En su caso, veo una oportunidad clara porque ${prospect.opportunity}.

${recommendationLine}

Yo me dedico a crear sitios web modernos para negocios locales en México, enfocados en verse profesionales, cargar rápido y generar más contactos.

Si quieren, puedo enviarles una propuesta visual rápida sin costo para mostrarles cómo podría verse su sitio.

¿Les interesaría?

Saludos,
Felipe
Aionsite
contacto@aionsite.com.mx`;

  return { subject, text };
}

module.exports = { buildEmail };
