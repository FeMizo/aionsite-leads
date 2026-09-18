import { describe, expect, it } from "vitest";
import { summarizeCrawl } from "@/lib/prospect-crawls";

describe("prospect crawl email summary", () => {
  it("uses findings reported by Crawl-Site and explains potential impact", () => {
    const summary = summarizeCrawl({ total: 8, withIssues: 3, stats: { "404": 2, noindex: 1 } });
    expect(summary).toContain("8 páginas");
    expect(summary).toContain("enlaces a páginas inexistentes");
    expect(summary).toContain("páginas excluidas de buscadores");
    expect(summary).toContain("impactos potenciales");
  });

  it("does not invent findings when no issues were reported", () => {
    const summary = summarizeCrawl({ total: 5, withIssues: 0, stats: {} });
    expect(summary).toContain("sin incidencias en las comprobaciones ejecutadas");
    expect(summary).not.toContain("enlaces a páginas inexistentes");
  });
});
