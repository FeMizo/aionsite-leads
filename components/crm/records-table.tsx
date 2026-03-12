"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CrmRecord, RecordAction } from "@/types/crm";

type ActionConfig = {
  action: RecordAction;
  label: string;
  variant?: "primary" | "secondary" | "danger";
};

type RecordsTableProps = {
  title: string;
  description: string;
  records: CrmRecord[];
  actions: ActionConfig[];
  emptyLabel: string;
  showSendDate?: boolean;
  sendDateLabel?: string;
};

async function postAction(action: RecordAction, ids: string[]) {
  const response = await fetch("/api/crm/actions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ids }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "No se pudo completar la accion.");
  }
}

function getStatusLabel(status: CrmRecord["status"]) {
  switch (status) {
    case "closed":
      return "cliente";
    case "generated":
      return "generated";
    case "prospect":
      return "prospect";
    case "contacted":
      return "contacted";
    case "failed":
      return "failed";
    case "replied":
      return "replied";
    case "archived":
      return "archived";
    case "deleted":
      return "deleted";
    default:
      return status;
  }
}

export function RecordsTable({
  title,
  description,
  records,
  actions,
  emptyLabel,
  showSendDate = false,
  sendDateLabel = "Enviado",
}: RecordsTableProps) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return records;
    }

    return records.filter((record) =>
      [
        record.businessName,
        record.category,
        record.city,
        record.email,
        record.website,
        record.source,
        record.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query, records]);

  function toggleSelection(recordId: string) {
    setSelectedIds((current) =>
      current.includes(recordId)
        ? current.filter((id) => id !== recordId)
        : [...current, recordId]
    );
  }

  function toggleAll() {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(filteredRecords.map((record) => record.id));
  }

  function runAction(action: RecordAction) {
    setError("");

    startTransition(async () => {
      try {
        await postAction(action, selectedIds);
        setSelectedIds([]);
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
                      filteredRecords.length > 0 &&
                      selectedIds.length === filteredRecords.length
                    }
                    onChange={toggleAll}
                  />
                </th>
                <th>Negocio</th>
                <th>Categoria</th>
                <th>Ciudad</th>
                <th>Email</th>
                <th>Website</th>
                <th>Fuente</th>
                <th>Estado</th>
                <th>Creado</th>
                {showSendDate ? <th>{sendDateLabel}</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr
                  key={record.id}
                  className={isSelected(record.id) ? "crm-table__row is-selected" : "crm-table__row"}
                  onClick={() => toggleSelection(record.id)}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected(record.id)}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => toggleSelection(record.id)}
                    />
                  </td>
                  <td>
                    <div className="record-primary">
                      <strong>{record.businessName}</strong>
                      {record.phone ? <span>{record.phone}</span> : null}
                    </div>
                  </td>
                  <td>{record.category}</td>
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
                  <td>{record.source || "manual"}</td>
                  <td>
                    <span className={`status-pill status-pill--${record.status}`}>
                      {getStatusLabel(record.status)}
                    </span>
                  </td>
                  <td>{new Date(record.createdAt).toLocaleString()}</td>
                  {showSendDate ? (
                    <td>{record.sentAt ? new Date(record.sentAt).toLocaleString() : "-"}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
