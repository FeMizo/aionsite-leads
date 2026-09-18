import { getPrismaClient } from "@/lib/db";
import type { CrawlEmailReport } from "@/lib/email-template";
import { crawlWebsiteInCrawlSite, getCrawlSummaryPdf } from "@/providers/crawl-site";

export async function startProspectCrawl(prospectId: string, retry = false) {
  const prisma = getPrismaClient();
  const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) throw new Error("Prospecto no encontrado.");
  if (!prospect.website) throw new Error("El prospecto no tiene sitio web.");
  const owner = await prisma.dashboardCredential.findUnique({ where: { id: 1 }, select: { username: true } });
  const url = prospect.website;
  const activeCrawl = await prisma.prospectCrawl.findFirst({
    where: { prospectId, siteUrl: url, status: { in: ["pending", "running"] } },
    orderBy: { createdAt: "desc" },
  });
  const latest = activeCrawl || await prisma.prospectCrawl.findFirst({ where: { prospectId, siteUrl: url }, orderBy: { createdAt: "desc" } });
  if (latest?.status === "completed" && !retry) return latest;
  if (latest?.status === "failed" && !retry) return latest;

  const crawl = activeCrawl
    ? await prisma.prospectCrawl.update({ where: { id: activeCrawl.id }, data: { status: "running", error: "" } })
    : await prisma.prospectCrawl.create({ data: { prospectId, ownerUsername: owner?.username || "", siteUrl: url, status: "running" } });
  try {
    const result = await crawlWebsiteInCrawlSite(url, `${crawl.id}:${crawl.attemptCount}`);
    if (!result) throw new Error("No se pudo iniciar el rastreo para este sitio.");
    await prisma.prospect.update({ where: { id: prospectId }, data: { crawlSiteRunId: result.runId } });
    await prisma.prospectCrawl.update({ where: { id: crawl.id }, data: {
      crawlSiteRunId: result.runId, projectId: result.projectId, crawlOwnerUserId: result.ownerUserId,
    } });
    if (result.status === "pending") {
      return prisma.prospectCrawl.update({ where: { id: crawl.id }, data: {
        status: "pending",
      } });
    }
    const pdf = await getCrawlSummaryPdf(result.runId);
    return await prisma.prospectCrawl.update({ where: { id: crawl.id }, data: {
      crawlSiteRunId: result.runId, projectId: result.projectId, status: "completed",
      crawlOwnerUserId: result.ownerUserId, summary: result.summary as object | undefined,
      pdfFilename: pdf.filename, pdfData: new Uint8Array(pdf.content),
    } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falló el rastreo.";
    const crawlError = error as Error & { crawlRunId?: string; terminal?: boolean };
    if (crawlError.crawlRunId) await prisma.prospect.update({ where: { id: prospectId }, data: { crawlSiteRunId: crawlError.crawlRunId } });
    return prisma.prospectCrawl.update({ where: { id: crawl.id }, data: {
      status: crawlError.terminal ? "failed" : "pending", error: message,
      ...(crawlError.crawlRunId ? { crawlSiteRunId: crawlError.crawlRunId } : {}),
    } });
  }
}

const CRAWL_FINDINGS: Record<string, { title: string; impact: string }> = {
  httpErrors: { title: "Acceso limitado durante el rastreo", impact: "Conviene comprobar el acceso automatizado; este resultado no confirma que las personas visitantes también estén bloqueadas." },
  "404": { title: "Enlaces a páginas inexistentes", impact: "Corregirlos podría reducir callejones sin salida para quienes navegan el sitio." },
  noindex: { title: "Páginas excluidas de buscadores", impact: "Vale la pena confirmar que las páginas importantes puedan aparecer en búsquedas." },
  titleIssues: { title: "Títulos de página por revisar", impact: "Títulos más claros pueden explicar mejor cada página en los resultados de búsqueda." },
  descIssues: { title: "Descripciones de búsqueda por mejorar", impact: "Una descripción precisa puede ayudar a las personas a decidir si el resultado responde a su búsqueda." },
  h1Issues: { title: "Encabezados principales por revisar", impact: "Una jerarquía clara puede facilitar que visitantes entiendan el tema de cada página." },
  imgIssues: { title: "Información de imágenes incompleta", impact: "Textos alternativos descriptivos ayudan a contextualizar imágenes y a tecnologías de asistencia." },
  brokenImages: { title: "Imágenes que no cargaron", impact: "Revisarlas podría evitar espacios visuales vacíos en las páginas afectadas." },
  brokenButtons: { title: "Botones o enlaces de acción por revisar", impact: "Comprobarlos ayuda a que las personas puedan completar la acción esperada." },
  placeholderLinks: { title: "Enlaces provisionales detectados", impact: "Sustituirlos por destinos funcionales puede facilitar la navegación." },
  formsNoAction: { title: "Formularios sin destino de envío", impact: "Revisar el destino puede ayudar a que las consultas lleguen al equipo adecuado." },
  formsNoSubmit: { title: "Formularios sin botón de envío", impact: "Una acción de envío visible puede hacer más claro cómo completar el formulario." },
  slowLoad: { title: "Páginas con carga lenta", impact: "Optimizar la carga podría reducir la espera, especialmente en conexiones móviles." },
  duplicates: { title: "Títulos repetidos", impact: "Diferenciarlos puede comunicar mejor el propósito de cada página." },
  noOg: { title: "Vista previa social incompleta", impact: "Completarla puede mejorar cómo aparece el sitio al compartirlo." },
  noTwitterCard: { title: "Vista previa para X incompleta", impact: "Completarla puede mejorar la presentación al compartir enlaces en esa plataforma." },
  noStructuredData: { title: "Datos estructurados no detectados", impact: "Añadir datos pertinentes puede dar a buscadores más contexto sobre el contenido." },
  noViewport: { title: "Configuración móvil por verificar", impact: "Comprobarla ayuda a presentar el contenido de forma adecuada en distintos tamaños de pantalla." },
  noCharset: { title: "Codificación de texto por verificar", impact: "Definirla explícitamente ayuda a mostrar caracteres de forma consistente." },
  renderBlockingJs: { title: "Scripts que pueden retrasar el renderizado", impact: "Revisarlos podría ayudar a mostrar antes el contenido principal." },
  renderBlockingCss: { title: "Hojas de estilo que pueden retrasar el renderizado", impact: "Revisarlas podría ayudar a presentar antes el contenido visible." },
  thinContent: { title: "Contenido breve en algunas páginas", impact: "Ampliarlo con información útil puede responder mejor a las preguntas de visitantes." },
  largeHtml: { title: "Páginas con HTML pesado", impact: "Reducir recursos innecesarios podría mejorar la transferencia inicial del documento." },
  weakNavigation: { title: "Navegación principal por revisar", impact: "Una navegación clara puede ayudar a encontrar servicios y datos de contacto." },
  headingSkips: { title: "Saltos en la jerarquía de encabezados", impact: "Ordenarlos puede facilitar la lectura y comprensión de la estructura." },
  blocked: { title: "Páginas bloqueadas por robots.txt", impact: "Confirma que el bloqueo sea intencional para las páginas incluidas." },
  orphanPages: { title: "Páginas sin enlaces internos detectados", impact: "Enlazarlas desde secciones pertinentes podría facilitar su descubrimiento." },
};

export function getCrawlEmailReport(summary: unknown): CrawlEmailReport | null {
  if (!summary || typeof summary !== "object") return null;
  const data = summary as { total?: number; withIssues?: number; stats?: Record<string, unknown> };
  if (typeof data.total !== "number" || typeof data.withIssues !== "number") return null;
  const total = Math.max(0, Math.trunc(data.total));
  const withIssues = Math.max(0, Math.min(total, Math.trunc(data.withIssues)));
  const stats = data.stats || {};
  const findings = Object.entries(CRAWL_FINDINGS)
    .map(([key, finding]) => ({ ...finding, pageCount: Math.max(0, Math.trunc(Number(stats[key]) || 0)) }))
    .filter((finding) => finding.pageCount > 0)
    .sort((a, b) => b.pageCount - a.pageCount || a.title.localeCompare(b.title, "es"))
    .slice(0, 3)
    .map(({ title, pageCount, impact }) => ({ title, pageCount, impact }));
  const headline = withIssues
    ? `Se revisaron ${total} páginas y se detectaron puntos por revisar en ${withIssues}.`
    : `Se revisaron ${total} páginas sin incidencias en las comprobaciones ejecutadas.`;
  return {
    headline,
    findings,
    scopeNote: `Este resumen se limita a las ${total} páginas rastreadas y a las comprobaciones ejecutadas. Los efectos descritos son potenciales; no se garantizan cambios en posiciones, visitas o ventas.`,
  };
}

export function summarizeCrawl(summary: unknown) {
  const report = getCrawlEmailReport(summary);
  if (!report) return "El rastreo terminó; revisa el PDF adjunto para consultar los hallazgos respaldados.";
  const findings = report.findings.map((finding) =>
    `- ${finding.title}: observado en ${finding.pageCount} ${finding.pageCount === 1 ? "página" : "páginas"}. ${finding.impact}`
  );
  return [report.headline, ...(findings.length ? ["Hallazgos principales:\n" + findings.join("\n")] : []), report.scopeNote].join("\n\n");
}
