"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api-client";
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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return records;
    }

    return records.filter((record) =>
      [
        record.name,
        record.type,
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

  function runAction(action: string) {
    setError("");

    startTransition(async () => {
      try {
        await postAction(endpoint, action, selectedIds);
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
                <th>Estado</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr
                  key={record.id}
                  className={
                    isSelected(record.id)
                      ? "crm-table__row is-selected"
                      : "crm-table__row"
                  }
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
                  <td>
                    <StatusPill status={record.status} />
                  </td>
                  <td>{new Date(record.lastCheckedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
