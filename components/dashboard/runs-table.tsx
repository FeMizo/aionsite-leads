import type { DashboardRun } from "@/lib/types";

type RunsTableProps = {
  runs: DashboardRun[];
};

export function RunsTable({ runs }: RunsTableProps) {
  if (!runs.length) {
    return <div className="empty-state">Todavia no hay corridas registradas.</div>;
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Corridas recientes</h2>
          <p>Metricas operativas por ejecucion del pipeline de prospecting.</p>
        </div>
      </div>

      <div className="crm-table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Fuente</th>
              <th>Busquedas</th>
              <th>Places</th>
              <th>Duplicados</th>
              <th>Emails</th>
              <th>Guardados</th>
              <th>Req. Places</th>
              <th>Fetches web</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td>{new Date(run.createdAt).toLocaleString()}</td>
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
                    className={`run-status ${run.status === "completed" ? "is-ok" : "is-error"}`}
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
