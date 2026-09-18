import { getPrismaClient } from "@/lib/db";
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

export function summarizeCrawl(summary: unknown) {
  if (!summary || typeof summary !== "object") return "El rastreo terminó, pero no devolvió métricas resumibles.";
  const data = summary as { total?: number; withIssues?: number; stats?: Record<string, unknown> };
  if (typeof data.total !== "number" || typeof data.withIssues !== "number") return "El rastreo terminó; revisa el PDF adjunto para ver los hallazgos respaldados.";
  if (!data.withIssues) return `Se revisaron ${data.total} páginas sin incidencias en las comprobaciones ejecutadas. El alcance se limita a esas páginas.`;
  const findingImpacts: Record<string, [string, string]> = {
    "404": ["enlaces a páginas inexistentes", "Repararlos puede reducir callejones sin salida y pérdida de visitas."],
    noindex: ["páginas excluidas de buscadores", "Conviene confirmar que las páginas importantes puedan aparecer en búsquedas."],
    titleIssues: ["títulos de página por mejorar", "Títulos claros ayudan a explicar cada página en los resultados."],
    descIssues: ["descripciones de búsqueda incompletas", "Descripciones útiles pueden hacer más atractivo el resultado."],
    h1Issues: ["encabezados principales por revisar", "Una jerarquía clara ayuda a visitantes y buscadores a entender la página."],
    brokenButtons: ["botones o enlaces de acción rotos", "Corregirlos puede facilitar el contacto y otras acciones."],
    formsNoAction: ["formularios sin destino de envío", "Revisarlos ayuda a que las consultas lleguen al negocio."],
    formsNoSubmit: ["formularios sin botón de envío", "Una acción clara facilita que los visitantes envíen sus datos."],
    slowLoad: ["páginas con carga lenta", "Mejorar velocidad puede reducir fricción, sobre todo en móviles."],
    duplicates: ["títulos repetidos", "Diferenciarlos ayuda a comunicar mejor el propósito de cada página."],
    noOg: ["vistas previas sociales incompletas", "Completarlas mejora cómo se presenta el sitio al compartirlo."],
    noStructuredData: ["datos estructurados faltantes", "Añadirlos ayuda a describir el negocio y su contenido a buscadores."],
  };
  const findings = Object.entries(findingImpacts)
    .filter(([key]) => Number(data.stats?.[key]) > 0)
    .slice(0, 3)
    .map(([, [label, impact]]) => `${label}: ${impact}`);
  const detail = findings.length ? findings.join(" ") : "El informe adjunto detalla los hallazgos observados.";
  return `Se revisaron ${data.total} páginas y se detectaron hallazgos en ${data.withIssues}. ${detail} Son impactos potenciales; el análisis cubre únicamente las páginas revisadas.`;
}
