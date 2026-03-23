"use client";

import { useMemo, useState } from "react";
import type { DashboardRun } from "@/lib/types";
import { formatDashboardDateTime } from "@/lib/date-format";
import { compareSortValues, type SortDirection, type SortType } from "@/lib/table-sort";
import { SortIndicator } from "@/components/dashboard/sort-indicator";

type RunsTableProps = {
  runs: DashboardRun[];
};

type RunSortKey =
  | "createdAt"
  | "source"
  | "searchesCount"
  | "placesFound"
  | "duplicatesFiltered"
  | "emailsFound"
  | "prospectsSaved"
  | "googlePlacesRequests"
  | "websiteFetches"
  | "status";

type RunColumn = {
  key: RunSortKey;
  label: string;
  type: SortType;
  defaultDirection: SortDirection;
  getValue: (run: DashboardRun) => unknown;
};

export function RunsTable({ runs }: RunsTableProps) {
  const [sortState, setSortState] = useState<{
    key: RunSortKey;
    direction: SortDirection;
  } | null>(null);

  const columns = useMemo<RunColumn[]>(
    () => [
      {
        key: "createdAt",
        label: "Fecha",
        type: "date",
        defaultDirection: "desc",
        getValue: (run) => run.createdAt,
      },
      {
        key: "source",
        label: "Fuente",
        type: "string",
        defaultDirection: "asc",
        getValue: (run) => run.source,
      },
      {
        key: "searchesCount",
        label: "Busquedas",
        type: "number",
        defaultDirection: "desc",
        getValue: (run) => run.searchesCount,
      },
      {
        key: "placesFound",
        label: "Places",
        type: "number",
        defaultDirection: "desc",
        getValue: (run) => run.placesFound,
      },
      {
        key: "duplicatesFiltered",
        label: "Duplicados",
        type: "number",
        defaultDirection: "desc",
        getValue: (run) => run.duplicatesFiltered,
      },
      {
        key: "emailsFound",
        label: "Emails",
        type: "number",
        defaultDirection: "desc",
        getValue: (run) => run.emailsFound,
      },
      {
        key: "prospectsSaved",
        label: "Guardados",
        type: "number",
        defaultDirection: "desc",
        getValue: (run) => run.prospectsSaved,
      },
      {
        key: "googlePlacesRequests",
        label: "Req. Places",
        type: "number",
        defaultDirection: "desc",
        getValue: (run) => run.googlePlacesRequests,
      },
      {
        key: "websiteFetches",
        label: "Fetches web",
        type: "number",
        defaultDirection: "desc",
        getValue: (run) => run.websiteFetches,
      },
      {
        key: "status",
        label: "Estado",
        type: "string",
        defaultDirection: "asc",
        getValue: (run) => run.status,
      },
    ],
    []
  );

  const sortedRuns = useMemo(() => {
    if (!sortState) {
      return runs;
    }

    const activeColumn = columns.find((column) => column.key === sortState.key);

    if (!activeColumn) {
      return runs;
    }

    return [...runs].sort((left, right) =>
      compareSortValues(
        activeColumn.getValue(left),
        activeColumn.getValue(right),
        activeColumn.type,
        sortState.direction
      )
    );
  }, [columns, runs, sortState]);

  if (!runs.length) {
    return <div className="empty-state">Todavia no hay busquedas registradas.</div>;
  }

  function toggleSort(column: RunColumn) {
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

  function getSortDirection(columnKey: RunSortKey): SortDirection | null {
    if (!sortState || sortState.key !== columnKey) {
      return null;
    }

    return sortState.direction;
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Busquedas recientes</h2>
          <p>Metricas operativas por ejecucion del pipeline de prospecting.</p>
        </div>
      </div>

      <div className="crm-table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              {columns.map((column) => (
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
            {sortedRuns.map((run) => (
              <tr key={run.id}>
                <td>{formatDashboardDateTime(run.createdAt)}</td>
                <td>{run.source}</td>
                <td>{run.searchesCount}</td>
                <td>{run.placesFound}</td>
                <td>{run.duplicatesFiltered}</td>
                <td>{run.emailsFound}</td>
                <td>{run.prospectsSaved}</td>
                <td>{run.googlePlacesRequests}</td>
                <td>{run.websiteFetches}</td>
                <td>
                  <span
                    className={`run-status ${
                      run.status === "completed"
                        ? "is-ok"
                        : run.status === "running"
                          ? "is-running"
                          : "is-error"
                    }`}
                    title={run.error || ""}
                  >
                    {run.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
