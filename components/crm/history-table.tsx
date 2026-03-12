import type { CrmHistoryEntry } from "@/types/crm";

type HistoryTableProps = {
  entries: CrmHistoryEntry[];
};

export function HistoryTable({ entries }: HistoryTableProps) {
  if (!entries.length) {
    return <div className="empty-state">Todavia no hay eventos en el historial.</div>;
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Historial completo</h2>
          <p>Generacion, movimientos de pipeline, errores y envios.</p>
        </div>
      </div>

      <div className="crm-table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Negocio</th>
              <th>Accion</th>
              <th>De</th>
              <th>A</th>
              <th>Nota</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.at).toLocaleString()}</td>
                <td>{entry.businessName}</td>
                <td>{entry.action}</td>
                <td>{entry.fromStatus || "-"}</td>
                <td>{entry.toStatus || "-"}</td>
                <td>{entry.note || "-"}</td>
                <td>{entry.error || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
