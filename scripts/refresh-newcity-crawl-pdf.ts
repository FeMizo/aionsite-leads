import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const NEWCITY_PROSPECT_ID = "cmtu9nobg000v04jgtg5vf7pq";

async function main() {
  const apply = process.argv.includes("--apply");
  if (process.argv.some((argument) => argument !== "--apply" && argument !== process.argv[0] && argument !== process.argv[1])) {
    throw new Error("Uso: tsx scripts/refresh-newcity-crawl-pdf.ts [--apply]");
  }
  const [{ getPrismaClient }, { getCrawlSummaryPdf }] = await Promise.all([
    import("@/lib/db"),
    import("@/providers/crawl-site"),
  ]);
  const prisma = getPrismaClient();
  try {
    const prospect = await prisma.prospect.findUnique({ where: { id: NEWCITY_PROSPECT_ID }, select: { id: true, website: true } });
    if (!prospect || !/newcitymed\.com/i.test(prospect.website)) throw new Error("La ficha configurada no corresponde a NewCity Medical Plaza.");
    const crawl = await prisma.prospectCrawl.findFirst({
      where: { prospectId: prospect.id, status: "completed", crawlSiteRunId: { not: "" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, crawlSiteRunId: true, pdfFilename: true, updatedAt: true },
    });
    if (!crawl) throw new Error("NewCity no tiene un rastreo completado para regenerar el PDF.");
    console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", crawlId: crawl.id, runIdPresent: true, currentPdf: crawl.pdfFilename, newCrawlStarted: false }));
    if (!apply) return;

    const pdf = await getCrawlSummaryPdf(crawl.crawlSiteRunId);
    if (pdf.content.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("Crawl-Site no devolvió un PDF válido.");
    const result = await prisma.prospectCrawl.updateMany({
      where: { id: crawl.id, prospectId: prospect.id, status: "completed", crawlSiteRunId: crawl.crawlSiteRunId },
      data: { pdfFilename: pdf.filename, pdfData: new Uint8Array(pdf.content) },
    });
    if (result.count !== 1) throw new Error("El registro de NewCity cambió durante la actualización; no se guardó el PDF.");
    console.log(JSON.stringify({ mode: "apply", updated: true, filename: pdf.filename, bytes: pdf.content.length, newCrawlStarted: false }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "No se pudo actualizar el PDF de NewCity.");
  process.exitCode = 1;
});
