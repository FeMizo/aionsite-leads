"use client";

import { useMemo, useState } from "react";
import { ProspectTable } from "@/components/dashboard/prospect-table";
import type { DashboardProspect } from "@/lib/types";

type WorkspaceFilter = "all" | "generated" | "approved" | "ready" | "contacted" | "followup" | "replied" | "closed" | "rejected" | "uncontactable";

const filters: Array<{ key: WorkspaceFilter; label: string; statuses?: string[] }> = [
  { key: "all", label: "Todos" },
  { key: "generated", label: "Generados", statuses: ["generated", "analyzed"] },
  { key: "approved", label: "Aprobados", statuses: ["approved"] },
  { key: "ready", label: "Listos para enviar", statuses: ["ready"] },
  { key: "contacted", label: "Contactados", statuses: ["contacted"] },
  { key: "followup", label: "Seguimiento", statuses: ["followup"] },
  { key: "replied", label: "Respondidos", statuses: ["replied"] },
  { key: "closed", label: "Clientes", statuses: ["closed"] },
  { key: "rejected", label: "Rechazados", statuses: ["rejected"] },
  { key: "uncontactable", label: "Sin contactar", statuses: ["uncontactable"] },
];

function getFilterRecords(records: DashboardProspect[], filter: (typeof filters)[number]) {
  if (!filter.statuses) return records;
  return records.filter((record) => filter.statuses?.includes(record.status));
}

export function CrmWorkspace({ records }: { records: DashboardProspect[] }) {
  const [activeFilter, setActiveFilter] = useState<WorkspaceFilter>("all");
  const [page, setPage] = useState(1);
  const currentFilter = filters.find((filter) => filter.key === activeFilter) || filters[0];
  const visibleRecords = useMemo(() => getFilterRecords(records, currentFilter), [currentFilter, records]);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(visibleRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRecords = visibleRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const isReadyFilter = activeFilter === "ready";
  const actions = activeFilter === "generated"
    ? [
        { action: "approveGenerated", label: "Aprobar seleccionados", variant: "primary" as const },
        { action: "rejectRecords", label: "Rechazar", variant: "danger" as const },
      ]
    : activeFilter === "approved"
      ? [{ action: "generateDrafts", label: "Preparar mensajes", variant: "primary" as const }]
      : activeFilter === "contacted" || activeFilter === "replied" || activeFilter === "followup"
        ? [{ action: "markAsClient", label: "Marcar como cliente", variant: "primary" as const }]
        : isReadyFilter
          ? [{ action: "sendSelected", label: "Enviar seleccionados", variant: "primary" as const }]
          : [];

  return (
    <section className="crm-workspace">
      <div className="crm-workspace__filters" role="tablist" aria-label="Filtrar prospectos por etapa">
        {filters.map((filter) => {
          const count = getFilterRecords(records, filter).length;
          return (
            <button
              key={filter.key}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter.key}
              className={activeFilter === filter.key ? "crm-workspace__filter is-active" : "crm-workspace__filter"}
              onClick={() => {
                setActiveFilter(filter.key);
                setPage(1);
              }}
            >
              <span>{filter.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>
      <ProspectTable
        title={currentFilter.label}
        description="Selecciona registros para ejecutar acciones o abre el nombre para revisar y cambiar su estado sin salir de esta vista."
        records={paginatedRecords}
        endpoint={isReadyFilter ? "/api/send" : "/api/prospects"}
        actions={actions}
        emptyLabel="No hay prospectos en esta etapa."
      />
      {visibleRecords.length > pageSize ? (
        <div className="crm-pagination crm-workspace__pagination">
          <button
            type="button"
            className="crm-pagination__btn"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Anterior
          </button>
          <span className="crm-pagination__info">
            Página {currentPage} de {totalPages}
            <span className="crm-pagination__total"> · {visibleRecords.length} registros</span>
          </span>
          <button
            type="button"
            className="crm-pagination__btn"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </section>
  );
}
