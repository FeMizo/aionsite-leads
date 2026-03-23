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
  if (status === "closed") {
    return "cliente";
  }

  if (status === "scheduled") {
    return "programado";
  }

  return status;
}
