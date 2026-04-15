// lib/tooltips.ts
// Tooltips para columnas y secciones del dashboard.

export const columnTooltips: Record<string, string> = {
  name: "Nombre del negocio encontrado por el pipeline. Haz clic para ver el detalle completo del prospecto.",
  type: "Categoria o giro del negocio segun Google Places.",
  city: "Ciudad donde opera el negocio. El horario de envio se ajusta a esta ubicacion.",
  email: "Correo de contacto detectado automaticamente. Sin email, no se puede enviar.",
  website: "Sitio web del negocio. El pipeline lo analiza para calcular el score.",
  score: "Puntuacion del 0 al 100 basada en calidad del sitio web y señales del negocio. Mayor score = mejor oportunidad.",
  priority: "Prioridad calculada para envio: alto (score alto + email valido), medio, o bajo. Solo los de prioridad alta se envian automaticamente.",
  status: "Etapa actual del prospecto en el flujo: generated → approved → ready → contacted → replied → closed.",
  scheduledSendAt: "Fecha y hora programada para el envio del correo. Si dice 'Enviar ahora', esta listo para salir.",
  lastCheckedAt: "Ultima vez que el registro fue actualizado por el pipeline o por una accion manual.",
};

export const statusTooltips: Record<string, string> = {
  generated: "El pipeline lo encontro pero todavia no fue revisado. Decide si aprobarlo o rechazarlo.",
  analyzed: "El pipeline analizó su sitio web. Pendiente de decision.",
  approved: "Aprobado para contactar. Falta preparar el mensaje antes de poder enviarlo.",
  ready: "Mensaje generado y listo para enviar. Vive en la seccion Envios.",
  contacted: "El correo ya fue enviado. Se monitorea si responde.",
  replied: "El prospecto respondio. Requiere seguimiento comercial.",
  closed: "Ciclo cerrado (cliente ganado o descartado definitivamente).",
  rejected: "Descartado. No se incluye en busquedas ni envios futuros.",
  scheduled: "Envio programado para una fecha y hora especifica segun horario de negocio.",
};

export const metricTooltips: Record<string, string> = {
  generated: "Prospectos nuevos capturados por el pipeline pendientes de revision.",
  prospects: "Prospectos aprobados que aun no tienen mensaje preparado.",
  ready: "Prospectos con draft listo y prioridad alta esperando envio.",
  contacted: "Total de prospectos a los que ya se les envio un correo.",
  runs: "Busquedas ejecutadas por el pipeline automatico o manualmente.",
};
