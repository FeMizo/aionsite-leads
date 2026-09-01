export function getProspectDisplayStatus(
  status: string,
  scheduledSendAt?: string | null,
  referenceDate = new Date()
) {
  if (status !== "ready" || !scheduledSendAt) {
    return status;
  }

  const scheduledDate = new Date(scheduledSendAt);

  if (Number.isNaN(scheduledDate.getTime())) {
    return status;
  }

  return scheduledDate.getTime() > referenceDate.getTime() ? "scheduled" : status;
}

export function getProspectStatusLabel(status: string) {
  const labels: Record<string, string> = {
    generated: "generado",
    analyzed: "analizado",
    approved: "aprobado",
    ready: "listo para enviar",
    scheduled: "programado",
    contacted: "contactado",
    followup: "seguimiento",
    replied: "respondió",
    closed: "cliente",
    rejected: "rechazado",
    uncontactable: "sin poder contactar",
  };

  return labels[status] || status;
}
