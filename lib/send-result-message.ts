import { formatDashboardDateTime } from "@/lib/date-format";

function formatActionResult(
  endpoint: "/api/prospects" | "/api/send",
  payload: unknown
) {
  if (endpoint !== "/api/send" || !payload || typeof payload !== "object") {
    return "Acción completada.";
  }

  const result =
    "result" in payload && payload.result && typeof payload.result === "object"
      ? (payload.result as Record<string, unknown>)
      : null;

  if (!result) {
    return "Acción completada.";
  }

  const sent = Number(result.sent || 0) + Number(result.followupsSent || 0);
  const scheduled = Number(result.scheduled || 0);
  const scheduledCreated = Number(result.scheduledCreated || 0);
  const scheduledItems = Array.isArray(result.scheduledItems)
    ? result.scheduledItems
        .map((item) =>
          item && typeof item === "object" && "scheduledSendAt" in item
            ? {
                scheduledSendAt: String(
                  (item as { scheduledSendAt?: unknown }).scheduledSendAt || ""
                ),
                city:
                  "city" in item && typeof item.city === "string" ? item.city : "",
              }
            : null
        )
        .filter((value): value is { scheduledSendAt: string; city: string } => Boolean(value))
    : [];
  const blocked = Number(result.blocked || 0);
  const failed = Number(result.failed || 0);
  const firstScheduledLabel = scheduledItems[0]
    ? formatDashboardDateTime(scheduledItems[0].scheduledSendAt, {
        city: scheduledItems[0].city,
      })
    : null;

  if (sent > 0) {
    return scheduledCreated > 0
      ? firstScheduledLabel
        ? `Se enviaron ${sent} correos. ${scheduledCreated} se programaron; el siguiente sale ${firstScheduledLabel}.`
        : `Se enviaron ${sent} correos. ${scheduledCreated} se programaron para más tarde.`
      : `Se enviaron ${sent} correos.`;
  }

  if (scheduledCreated > 0) {
    return firstScheduledLabel
      ? `Se programaron ${scheduledCreated} correos. El siguiente envío será ${firstScheduledLabel}.`
      : `Se programaron ${scheduledCreated} correos para el siguiente horario válido. Revisa la columna de envío para ver fecha y hora.`;
  }

  if (scheduled > 0) {
    return firstScheduledLabel
      ? `Los seleccionados ya estaban programados. El siguiente envío será ${firstScheduledLabel}.`
      : `Los seleccionados ya están programados para otra fecha u hora. No se enviarán hasta que llegue ese momento.`;
  }

  if (blocked > 0 || failed > 0) {
    return "No se enviaron correos. Revisa prioridad alta, correo válido, borrador y horario recomendado.";
  }

  return "No había correos listos para enviar ahora.";
}

export function getActionSuccessMessage(
  endpoint: "/api/prospects" | "/api/send",
  payload: unknown
) {
  const message = formatActionResult(endpoint, payload);
  if (endpoint !== "/api/send" || !payload || typeof payload !== "object" || !("result" in payload)
    || !payload.result || typeof payload.result !== "object") {
    return message;
  }
  const result = payload.result as Record<string, unknown>;
  const issues = [
    Number(result.blocked) > 0 ? `${Number(result.blocked)} bloqueados` : "",
    Number(result.failed) > 0 ? `${Number(result.failed)} fallidos` : "",
  ].filter(Boolean);
  return issues.length ? `${message} Pendientes de revisión: ${issues.join(" y ")}.` : message;
}