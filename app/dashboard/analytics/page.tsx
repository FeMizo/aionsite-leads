import type { Metadata } from "next";
import { getPrismaClient } from "@/lib/db";
import { buildCrmAnalytics } from "@/lib/crm-analytics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analítica CRM",
  description: "Respuestas y rendimiento por ciudad, nicho, fuente, prompt y oferta.",
};

function DimensionTable({ title, data }: { title: string; data: Record<string, { prospects: number; replied: number; interested: number }> }) {
  const rows = Object.entries(data).sort((a, b) => b[1].interested - a[1].interested || b[1].replied - a[1].replied);

  return (
    <section className="panel">
      <div className="panel__header"><h2>{title}</h2></div>
      {rows.length ? (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead><tr><th>Segmento</th><th>Prospectos</th><th>Respuestas</th><th>Interesados</th></tr></thead>
            <tbody>{rows.map(([label, values]) => <tr key={label}><td>{label}</td><td>{values.prospects}</td><td>{values.replied}</td><td>{values.interested}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <p>No hay datos todavía.</p>}
    </section>
  );
}

export default async function AnalyticsPage() {
  const prisma = getPrismaClient();
  const prospects = await prisma.prospect.findMany({
    select: { city: true, type: true, source: true, promptVersion: true, recommendedOffer: true, status: true, responseCategory: true, revenue: true },
    orderBy: { updatedAt: "desc" },
  });
  const analytics = buildCrmAnalytics(prospects);

  return (
    <div className="page-stack">
      <header className="page-header">
        <span className="page-header__eyebrow">Medición</span>
        <h1>Analítica de respuestas</h1>
        <p>Compara qué segmentos, prompts y ofertas generan conversaciones.</p>
        <p><a className="button button--secondary" href="/api/exports/prospects">Exportar prospectos a Excel</a></p>
      </header>
      <section className="dashboard-metrics">
        {Object.entries({ Prospectos: analytics.totals.prospects, Contactados: analytics.totals.contacted, Respuestas: analytics.totals.replied, Interesados: analytics.totals.interested, Clientes: analytics.totals.closed, Ingresos: `$${analytics.totals.revenue.toLocaleString("es-MX")}` }).map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </section>
      <div className="detail-grid">
        <div className="detail-main"><DimensionTable title="Por ciudad" data={analytics.byCity} /><DimensionTable title="Por nicho" data={analytics.byType} /><DimensionTable title="Por fuente" data={analytics.bySource} /></div>
        <div className="detail-side"><DimensionTable title="Por prompt" data={analytics.byPrompt} /><DimensionTable title="Por oferta" data={analytics.byOffer} /></div>
      </div>
    </div>
  );
}
