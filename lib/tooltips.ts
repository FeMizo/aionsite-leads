// lib/tooltips.ts
// Tooltips para columnas y secciones del dashboard.

export const columnTooltips: Record<string, string> = {
  name: "Nombre del negocio encontrado por el pipeline. Haz clic para ver el detalle completo del prospecto.",
  type: "Categoria o giro del negocio segun Google Places.",
  city: "Ciudad donde opera el negocio. El horario de envío se ajusta a esta ubicación.",
  email: "Correo de contacto detectado automáticamente. Sin correo, no se puede enviar.",
  website: "Sitio web del negocio. El pipeline lo analiza para calcular el score.",
  score: "Puntuacion del 0 al 100 basada en calidad del sitio web y señales del negocio. Mayor score = mejor oportunidad.",
  priority: "Prioridad calculada para el envío: alta (score alto + correo válido), media o baja. Solo los de prioridad alta se envían automáticamente.",
  status: "Etapa actual del prospecto en el flujo: generated → approved → ready → contacted → segundo intento → replied → closed, o sin poder contactar.",
  scheduledSendAt: "Fecha y hora programada para el envío del correo. Si dice 'Enviar ahora', está listo para salir.",
  lastCheckedAt: "Última vez que el registro fue actualizado por el pipeline o por una acción manual.",
};

export const statusTooltips: Record<string, string> = {
  generated: "El pipeline lo encontró, pero todavía no fue revisado. Decide si aprobarlo o rechazarlo.",
  analyzed: "El pipeline analizó su sitio web. Pendiente de decisión.",
  approved: "Aprobado para contactar. Falta preparar el mensaje antes de poder enviarlo.",
  ready: "Mensaje generado y listo para enviar. Vive en la seccion Enviar.",
  contacted: "El correo ya fue enviado. Se monitorea si responde.",
  second_attempt: "Se realizó un segundo intento de contacto. Se monitorea si responde.",
  followup: "Requiere seguimiento comercial y puede recibir el siguiente contacto programado.",
  replied: "El prospecto respondió. Requiere seguimiento comercial.",
  closed: "Ciclo cerrado (cliente ganado o descartado definitivamente).",
  rejected: "Descartado. No se incluye en búsquedas ni envíos futuros.",
  uncontactable: "No se puede contactar actualmente. No se incluye en envíos futuros.",
  scheduled: "Envio programado para una fecha y hora especifica segun horario de negocio.",
};

export const metricTooltips: Record<string, string> = {
  generated: "Prospectos nuevos capturados por el pipeline pendientes de revisión.",
  prospects: "Prospectos aprobados que aún no tienen mensaje preparado.",
  ready: "Prospectos con borrador listo y prioridad alta esperando envío.",
  contacted: "Total de prospectos a los que ya se les envió un correo.",
  runs: "Busquedas ejecutadas por el pipeline automatico o manualmente.",
};
