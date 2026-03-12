import type { OverviewMetrics } from "@/types/crm";

type DashboardCardsProps = {
  metrics: OverviewMetrics;
};

export function DashboardCards({ metrics }: DashboardCardsProps) {
  const cards = [
    { label: "Generated", value: metrics.generated },
    { label: "Prospects", value: metrics.prospects },
    { label: "Contacted", value: metrics.contacted },
    { label: "Failed", value: metrics.failed },
    { label: "Total enviados", value: metrics.totalSent },
  ];

  return (
    <section className="crm-cards">
      {cards.map((card) => (
        <article key={card.label} className="crm-card">
          <span className="crm-card__label">{card.label}</span>
          <strong className="crm-card__value">{card.value}</strong>
        </article>
      ))}
    </section>
  );
}
