"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatDashboardDateTime } from "@/lib/date-format";
import { getProspectDisplayStatus, getProspectStatusLabel } from "@/lib/prospect-status";
import type { DashboardProspect } from "@/lib/types";
import { StatusPill } from "@/components/dashboard/status-pill";

type ActionConfig = {
  action: string;
  label: string;
  variant?: "primary" | "secondary" | "danger";
};

type ProspectTableProps = {
  title: string;
  description: string;
  records: DashboardProspect[];
  actions: ActionConfig[];
  endpoint: "/api/prospects" | "/api/send";
  emptyLabel: string;
};

async function postAction(
  endpoint: "/api/prospects" | "/api/send",
  action: string,
  ids: string[]
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(endpoint === "/api/send" ? { ids } : { action, ids }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(payload, "No se pudo completar la accion."));
  }

  return response.json().catch(() => ({}));
}

function getActionSuccessMessage(
  endpoint: "/api/prospects" | "/api/send",
  payload: unknown
) {
  if (endpoint !== "/api/send" || !payload || typeof payload !== "object") {
    return "Accion completada.";
  }

  const result =
    "result" in payload && payload.result && typeof payload.result === "object"
      ? (payload.result as Record<string, unknown>)
      : null;

  if (!result) {
    return "Accion completada.";
  }

  const sent = Number(result.sent || 0) + Number(result.followupsSent || 0);
  const scheduled = Number(result.scheduled || 0);
  const scheduledCreated = Number(result.scheduledCreated || 0);
  const scheduledItems = Array.isArray(result.scheduledItems)
    ? result.scheduledItems
        .map((item) =>
          item && typeof item === "object" && "scheduledSendAt" in item
            ? String((item as { scheduledSendAt?: unknown }).scheduledSendAt || "")
            : ""
        )
        .filter((value) => value)
    : [];
  const blocked = Number(result.blocked || 0);
  const failed = Number(result.failed || 0);
  const firstScheduledLabel = scheduledItems[0]
    ? formatDashboardDateTime(scheduledItems[0])
    : null;

  if (sent > 0) {
    return scheduledCreated > 0
      ? firstScheduledLabel
        ? `Se enviaron ${sent} correos. ${scheduledCreated} se programaron; el siguiente sale ${firstScheduledLabel}.`
        : `Se enviaron ${sent} correos. ${scheduledCreated} se programaron para mas tarde.`
      : `Se enviaron ${sent} correos.`;
  }

  if (scheduledCreated > 0) {
    return firstScheduledLabel
      ? `Se programaron ${scheduledCreated} correos. El siguiente envio sera ${firstScheduledLabel}.`
      : `Se programaron ${scheduledCreated} correos para el siguiente horario valido. Revisa la columna de envio para ver fecha y hora.`;
  }

  if (scheduled > 0) {
    return firstScheduledLabel
      ? `Los seleccionados ya estaban programados. El siguiente envio sera ${firstScheduledLabel}.`
      : `Los seleccionados ya estan programados para otra fecha u hora. No se enviaran hasta que llegue ese momento.`;
  }

  if (blocked > 0 || failed > 0) {
    return "No se enviaron correos. Revisa prioridad alta, email valido, borrador y horario recomendado.";
  }

  return "No habia correos listos para enviar ahora.";
}

export function ProspectTable({
  title,
  description,
  records,
  actions,
  endpoint,
  emptyLabel,
}: ProspectTableProps) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const showScheduledColumn =
    endpoint === "/api/send" || records.some((record) => Boolean(record.scheduledSendAt));

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return records;
    }

    return records.filter((record) =>
      [
        getProspectDisplayStatus(record.status, record.scheduledSendAt),
        getProspectStatusLabel(getProspectDisplayStatus(record.status, record.scheduledSendAt)),
      ]
        .concat([
          record.name,
          record.type,
          record.city,
          record.email,
          record.website,
          record.source,
          record.status,
        ])
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query, records]);

  function getScheduledLabel(record: DashboardProspect) {
    if (!record.scheduledSendAt) {
      return "Enviar ahora";
    }

    return formatDashboardDateTime(record.scheduledSendAt);
  }

  function getScheduledHint(record: DashboardProspect) {
    const displayStatus = getProspectDisplayStatus(record.status, record.scheduledSendAt);

    if (!record.scheduledSendAt) {
      return "Sin fecha programada";
    }

    return displayStatus === "scheduled" ? "Fecha y hora de envio" : "Fecha registrada";
  }

  function getDisplayStatus(record: DashboardProspect) {
    return getProspectDisplayStatus(record.status, record.scheduledSendAt);
  }

  function isSendDisabled(record: DashboardProspect) {
    return endpoint === "/api/send" && getDisplayStatus(record) === "scheduled";
  }

  const selectableRecords = filteredRecords.filter((record) => !isSendDisabled(record));

  function toggleSelection(recordId: string) {
    const record = filteredRecords.find((item) => item.id === recordId);

    if (record && isSendDisabled(record)) {
      return;
    }

    setSelectedIds((current) =>
      current.includes(recordId)
        ? current.filter((id) => id !== recordId)
        : [...current, recordId]
    );
  }

  function toggleAll() {
    if (selectableRecords.length > 0 && selectedIds.length === selectableRecords.length) {
      setSelectedIds([]);
      return;
    }

    if (!selectableRecords.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(selectableRecords.map((record) => record.id));
  }

  function runAction(action: string) {
    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        const payload = await postAction(endpoint, action, selectedIds);
        setSelectedIds([]);
        setSuccess(getActionSuccessMessage(endpoint, payload));
        router.refresh();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo completar la accion."
        );
      }
    });
  }

  function isSelected(recordId: string) {
    return selectedIds.includes(recordId);
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <input
          className="crm-search"
          placeholder="Buscar negocio, email o ciudad"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="panel__actions">
        {actions.map((action) => (
          <button
            key={action.action}
            type="button"
            className={`crm-button crm-button--${action.variant || "secondary"}`}
            onClick={() => runAction(action.action)}
            disabled={!selectedIds.length || isPending}
          >
            {action.label}
          </button>
        ))}
      </div>

      {success ? <p className="crm-success">{success}</p> : null}
      {error ? <p className="crm-error">{error}</p> : null}

      {!filteredRecords.length ? (
        <div className="empty-state">{emptyLabel}</div>
      ) : (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      selectableRecords.length > 0 &&
                      selectedIds.length === selectableRecords.length
                    }
                    onChange={toggleAll}
                    disabled={selectableRecords.length === 0}
                  />
                </th>
                <th>Negocio</th>
                <th>Categoria</th>
                <th>Ciudad</th>
                <th>Email</th>
                <th>Website</th>
                <th>Score</th>
                <th>Prioridad</th>
                <th>Estado</th>
                {showScheduledColumn ? <th>Envio</th> : null}
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const displayStatus = getDisplayStatus(record);
                const sendDisabled = isSendDisabled(record);

                return (
                  <tr
                    key={record.id}
                    className={
                      isSelected(record.id)
                        ? "crm-table__row is-selected"
                        : sendDisabled
                        ? "crm-table__row is-disabled"
                        : "crm-table__row"
                    }
                    onClick={() => {
                      if (sendDisabled) {
                        return;
                      }

                      toggleSelection(record.id);
                    }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected(record.id)}
                        disabled={sendDisabled}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleSelection(record.id)}
                      />
                    </td>
                    <td>
                      <div className="record-primary">
                        <strong>{record.name}</strong>
                        {record.phone ? <span>{record.phone}</span> : null}
                      </div>
                    </td>
                    <td>{record.type}</td>
                    <td>{record.city}</td>
                    <td>{record.email || "Sin email"}</td>
                    <td>
                      {record.website ? (
                        <a
                          href={record.website}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Abrir
                        </a>
                      ) : (
                        "Sin sitio"
                      )}
                    </td>
                    <td>{record.score}</td>
                    <td>
                      <span className={`priority-pill priority-pill--${record.priority}`}>
                        {record.priority}
                      </span>
                    </td>
                    <td>
                      <StatusPill status={displayStatus} />
                    </td>
                    {showScheduledColumn ? (
                      <td>
                        <div className="record-secondary">
                          <strong>{getScheduledLabel(record)}</strong>
                          <span>{getScheduledHint(record)}</span>
                        </div>
                      </td>
                    ) : null}
                    <td>{formatDashboardDateTime(record.lastCheckedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
