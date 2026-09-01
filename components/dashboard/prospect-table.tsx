"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { formatDashboardDateTime } from "@/lib/date-format";
import { getLeadTypeLabel } from "@/lib/lead-types";
import { getProspectDisplayStatus, getProspectStatusLabel } from "@/lib/prospect-status";
import { compareSortValues, type SortDirection, type SortType } from "@/lib/table-sort";
import { SortIndicator } from "@/components/dashboard/sort-indicator";
import type { DashboardProspect } from "@/lib/types";

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
  page?: number;
  pageSize?: number;
  totalCount?: number;
};

type ProspectSortKey =
  | "name"
  | "type"
  | "city"
  | "email"
  | "contact"
  | "website"
  | "score"
  | "priority"
  | "status"
  | "scheduledSendAt"
  | "lastContactedAt"
  | "updatedAt";

type ProspectColumn = {
  key: ProspectSortKey;
  label: string;
  type: SortType;
  defaultDirection: SortDirection;
  getValue: (record: DashboardProspect) => unknown;
};

type ProspectTab = "all" | "ready" | "scheduled";

const EDITABLE_STATUSES = [
  "generated",
  "analyzed",
  "approved",
  "ready",
  "contacted",
  "replied",
  "followup",
  "closed",
  "rejected",
  "uncontactable",
] as const;

function normalizeWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length === 10) {
    return `52${digits}`;
  }

  return digits;
}

function buildMailtoUrl(record: DashboardProspect) {
  if (!record.email) {
    return "";
  }

  const params = new URLSearchParams({
    subject: record.subject || `Oportunidad para ${record.name}`,
    body:
      record.message ||
      `Hola, soy Felipe, desarrollador web en AionSite. Estuve viendo ${record.name} y creo que hay una oportunidad para conseguir mas clientes en ${record.city}.`,
  });

  return `mailto:${record.email}?${params.toString()}`;
}

function buildWhatsAppUrl(record: DashboardProspect) {
  const phone = normalizeWhatsAppPhone(record.phone);

  if (!phone) {
    return "";
  }

  const message = `Hola, soy Felipe, desarrollador web en AionSite. Estuve viendo ${record.name} y creo que hay una oportunidad para conseguir mas clientes desde Google. Te puedo mandar una propuesta?`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

async function postAction(
  endpoint: "/api/prospects" | "/api/send",
  action: string,
  ids: string[],
  extraPayload: Record<string, unknown> = {}
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      endpoint === "/api/send" ? { ids, ...extraPayload } : { action, ids, ...extraPayload }
    ),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(payload, "No se pudo completar la accion."));
  }

  return response.json().catch(() => ({}));
}

async function markContacted(recordId: string) {
  await postAction("/api/prospects", "markContacted", [recordId]);
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
  page,
  pageSize,
  totalCount,
}: ProspectTableProps) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyContactId, setBusyContactId] = useState<string | null>(null);
  const [busyStatusId, setBusyStatusId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProspectTab>("all");
  const [sortState, setSortState] = useState<{
    key: ProspectSortKey;
    direction: SortDirection;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const hasPagination = page !== undefined && pageSize !== undefined && totalCount !== undefined;
  const showScheduledColumn =
    endpoint === "/api/send" || records.some((record) => Boolean(record.scheduledSendAt));
  const showLastContactedColumn = records.some((record) => Boolean(record.lastContactedAt));
  const showSendTabs = endpoint === "/api/send";

  const columns = useMemo<ProspectColumn[]>(
    () => [
      {
        key: "name",
        label: "Negocio",
        type: "string",
        defaultDirection: "asc",
        getValue: (record) => record.name,
      },
      {
        key: "type",
        label: "Categoria",
        type: "string",
        defaultDirection: "asc",
        getValue: (record) => record.type,
      },
      {
        key: "city",
        label: "Ciudad",
        type: "string",
        defaultDirection: "asc",
        getValue: (record) => record.city,
      },
      {
        key: "email",
        label: "Email",
        type: "string",
        defaultDirection: "asc",
        getValue: (record) => record.email,
      },
      {
        key: "contact",
        label: "Contacto",
        type: "string",
        defaultDirection: "desc",
        getValue: (record) => `${record.email ? "email" : ""} ${record.phone ? "phone" : ""}`,
      },
      {
        key: "website",
        label: "Website",
        type: "string",
        defaultDirection: "asc",
        getValue: (record) => record.website,
      },
      {
        key: "score",
        label: "Score",
        type: "number",
        defaultDirection: "desc",
        getValue: (record) => record.score,
      },
      {
        key: "priority",
        label: "Prioridad",
        type: "number",
        defaultDirection: "desc",
        getValue: (record) => {
          if (record.priority === "alto") {
            return 3;
          }

          if (record.priority === "medio") {
            return 2;
          }

          return 1;
        },
      },
      {
        key: "status",
        label: "Estado",
        type: "string",
        defaultDirection: "asc",
        getValue: (record) =>
          getProspectStatusLabel(getProspectDisplayStatus(record.status, record.scheduledSendAt)),
      },
      {
        key: "scheduledSendAt",
        label: "Envio",
        type: "date",
        defaultDirection: "asc",
        getValue: (record) => record.scheduledSendAt,
      },
      {
        key: "lastContactedAt",
        label: "Enviado",
        type: "date",
        defaultDirection: "desc",
        getValue: (record) => record.lastContactedAt,
      },
      {
        key: "updatedAt",
        label: "Actualizado",
        type: "date",
        defaultDirection: "desc",
        getValue: (record) => record.updatedAt,
      },
    ],
    []
  );

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    let nextRecords = records;

    if (showSendTabs && activeTab !== "all") {
      nextRecords = nextRecords.filter((record) => getDisplayStatus(record) === activeTab);
    }

    if (normalizedQuery) {
      nextRecords = nextRecords.filter((record) =>
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
    }

    if (!sortState) {
      return nextRecords;
    }

    const activeColumn = columns.find((column) => column.key === sortState.key);

    if (!activeColumn) {
      return nextRecords;
    }

    return [...nextRecords].sort((left, right) =>
      compareSortValues(
        activeColumn.getValue(left),
        activeColumn.getValue(right),
        activeColumn.type,
        sortState.direction
      )
    );
  }, [activeTab, columns, query, records, showSendTabs, sortState]);

  const totalVisibleCount = filteredRecords.length;
  const totalPages = hasPagination ? Math.max(1, Math.ceil(totalVisibleCount / pageSize)) : 1;
  const currentPage = page ?? 1;
  const safeCurrentPage = hasPagination ? Math.min(currentPage, totalPages) : currentPage;
  const paginatedRecords = hasPagination
    ? filteredRecords.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize)
    : filteredRecords;

  const tabCounts = useMemo(
    () => ({
      all: records.length,
      ready: records.filter((record) => getDisplayStatus(record) === "ready").length,
      scheduled: records.filter((record) => getDisplayStatus(record) === "scheduled").length,
    }),
    [records]
  );

  useEffect(() => {
    const visibleIds = new Set(filteredRecords.map((record) => record.id));

    setSelectedIds((current) => {
      const next = current.filter((id) => visibleIds.has(id));

      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }

      return next;
    });
  }, [filteredRecords]);

  useEffect(() => {
    setSelectedIds([]);
  }, [safeCurrentPage]);

  function getScheduledLabel(record: DashboardProspect) {
    if (!record.scheduledSendAt) {
      return "Enviar ahora";
    }

    return formatDashboardDateTime(record.scheduledSendAt, {
      city: record.city,
    });
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

  const selectableRecords = paginatedRecords.filter((record) => !isSendDisabled(record));

  function toggleSelection(recordId: string) {
    const record = paginatedRecords.find((item) => item.id === recordId);

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

  async function openContactChannel(
    record: DashboardProspect,
    channel: "email" | "whatsapp",
    href: string
  ) {
    if (!href || busyContactId) {
      return;
    }

    setError("");
    setSuccess("");
    setBusyContactId(`${record.id}:${channel}`);

    const popup =
      channel === "whatsapp"
        ? window.open("about:blank", "_blank")
        : null;

    try {
      if (popup) {
        popup.location.assign(href);
        popup.focus();
      } else {
        await markContacted(record.id);
        window.location.href = href;
      }

      router.refresh();
    } catch (requestError) {
      if (popup) {
        popup.close();
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo marcar como contactado."
      );
    } finally {
      setBusyContactId(null);
    }
  }

  async function changeRecordStatus(record: DashboardProspect, status: string) {
    if (status === record.status || busyStatusId) {
      return;
    }

    setError("");
    setSuccess("");
    setBusyStatusId(record.id);

    try {
      await postAction("/api/prospects", "changeStatus", [record.id], { status });
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cambiar el estado."
      );
    } finally {
      setBusyStatusId(null);
    }
  }

  function isSelected(recordId: string) {
    return selectedIds.includes(recordId);
  }

  function toggleSort(column: ProspectColumn) {
    setSortState((current) => {
      if (!current || current.key !== column.key) {
        return {
          key: column.key,
          direction: column.defaultDirection,
        };
      }

      return {
        key: column.key,
        direction: current.direction === "asc" ? "desc" : "asc",
      };
    });
  }

  function getSortDirection(columnKey: ProspectSortKey): SortDirection | null {
    if (!sortState || sortState.key !== columnKey) {
      return null;
    }

    return sortState.direction;
  }

  function navigateToPage(nextPage: number) {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(nextPage));
    router.push(`?${params.toString()}`);
  }

  function getEmptyStateLabel() {
    if (!showSendTabs || activeTab === "all") {
      return emptyLabel;
    }

    return activeTab === "scheduled"
      ? "No hay prospectos programados para envio."
      : "No hay prospectos listos para enviar.";
  }

  return (
    <Table
      title={title}
      description={description}
      hasRows={paginatedRecords.length > 0}
      actions={
        <input
          className="crm-search"
          placeholder="Buscar negocio, email o ciudad"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      }
      emptyState={<div className="empty-state">{getEmptyStateLabel()}</div>}
    >

      {showSendTabs ? (
        <div className="crm-tabs" aria-label="Filtros de envios">
          {[
            { key: "all" as const, label: "Todos", count: tabCounts.all },
            { key: "ready" as const, label: "Listos", count: tabCounts.ready },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? "crm-tab is-active" : "crm-tab"}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.label}</span>
              <strong>{tab.count}</strong>
            </button>
          ))}
        </div>
      ) : null}

      <div className="panel__actions">
        {actions.map((action) => (
          <Button
            key={action.action}
            variant={action.variant || "secondary"}
            onClick={() => runAction(action.action)}
            disabled={!selectedIds.length || isPending}
          >
            {action.label}
          </Button>
        ))}
      </div>

      {success ? <p className="crm-success">{success}</p> : null}
      {error ? <p className="crm-error">{error}</p> : null}

      <table className="crm-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={
                  selectableRecords.length > 0 &&
                  selectableRecords.every((record) => selectedIds.includes(record.id))
                }
                onChange={toggleAll}
                disabled={selectableRecords.length === 0}
              />
            </th>
            {columns
              .filter((column) => showScheduledColumn || column.key !== "scheduledSendAt")
              .filter((column) => showLastContactedColumn || column.key !== "lastContactedAt")
              .map((column) => (
                <th key={column.key}>
                  <button
                    type="button"
                    className={
                      sortState?.key === column.key
                        ? "crm-table__sort is-active"
                        : "crm-table__sort"
                    }
                    onClick={() => toggleSort(column)}
                  >
                    <span>{column.label}</span>
                    <SortIndicator direction={getSortDirection(column.key)} />
                  </button>
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {paginatedRecords.map((record) => {
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
                    <Link
                      href={`/dashboard/prospects/${record.id}`}
                      className="record-primary__link"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {record.name}
                    </Link>
                    {record.phone ? <span>{record.phone}</span> : null}
                  </div>
                </td>
                <td>{getLeadTypeLabel(record.type)}</td>
                <td>{record.city}</td>
                <td>{record.email || "Sin email"}</td>
                <td>
                  <div className="record-contact-actions">
                    {buildMailtoUrl(record) ? (
                      <button
                        type="button"
                        className="record-contact-actions__btn record-contact-actions__btn--email"
                        disabled={busyContactId !== null}
                        onClick={(event) => {
                          event.stopPropagation();
                          void openContactChannel(record, "email", buildMailtoUrl(record));
                        }}
                      >
                        {busyContactId === `${record.id}:email` ? "..." : "Email"}
                      </button>
                    ) : null}
                    {buildWhatsAppUrl(record) ? (
                      <button
                        type="button"
                        className="record-contact-actions__btn record-contact-actions__btn--whatsapp"
                        disabled={busyContactId !== null}
                        onClick={(event) => {
                          event.stopPropagation();
                          void openContactChannel(record, "whatsapp", buildWhatsAppUrl(record));
                        }}
                      >
                        {busyContactId === `${record.id}:whatsapp` ? "..." : "WhatsApp"}
                      </button>
                    ) : null}
                    {!buildMailtoUrl(record) && !buildWhatsAppUrl(record) ? (
                      <span className="record-contact-actions__empty">Sin contacto</span>
                    ) : null}
                  </div>
                </td>
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
                  <select
                    className="status-select"
                    value={record.status}
                    disabled={busyStatusId === record.id}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      event.stopPropagation();
                      void changeRecordStatus(record, event.target.value);
                    }}
                    aria-label={`Cambiar estado de ${record.name}`}
                  >
                    {EDITABLE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {displayStatus === "scheduled" && status === "ready"
                          ? "programado"
                          : getProspectStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </td>
                {showScheduledColumn ? (
                  <td>
                    <div className="record-secondary">
                      <strong>{getScheduledLabel(record)}</strong>
                      <span>{getScheduledHint(record)}</span>
                    </div>
                  </td>
                ) : null}
                {showLastContactedColumn ? (
                  <td>
                    {record.lastContactedAt
                      ? formatDashboardDateTime(record.lastContactedAt)
                      : "-"}
                  </td>
                ) : null}
                <td>{formatDashboardDateTime(record.updatedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {hasPagination && totalVisibleCount > pageSize ? (
        <div className="crm-pagination">
          <button
            type="button"
            className="crm-pagination__btn"
            disabled={safeCurrentPage <= 1}
            onClick={() => navigateToPage(safeCurrentPage - 1)}
          >
            Anterior
          </button>
          <span className="crm-pagination__info">
            Pagina {safeCurrentPage} de {totalPages}
            <span className="crm-pagination__total"> - {totalVisibleCount} registros</span>
          </span>
          <button
            type="button"
            className="crm-pagination__btn"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => navigateToPage(safeCurrentPage + 1)}
          >
            Siguiente
          </button>
        </div>
      ) : hasPagination && totalCount !== undefined ? (
        <div className="crm-pagination">
          <span className="crm-pagination__info">{totalVisibleCount} registros</span>
        </div>
      ) : null}
    </Table>
  );
}
