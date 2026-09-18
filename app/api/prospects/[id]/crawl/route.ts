import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { startProspectCrawl, summarizeCrawl } from "@/lib/prospect-crawls";
import { isAuthenticatedProspectCrawlRequest } from "@/lib/prospect-crawl-auth";

type Context = { params: Promise<{ id: string }> };

export const maxDuration = 120;

export async function GET(request: NextRequest, { params }: Context) {
  if (!(await isAuthenticatedProspectCrawlRequest(request))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const prisma = getPrismaClient();
  const crawlId = request.nextUrl.searchParams.get("crawlId");
  if (crawlId) {
    const crawl = await prisma.prospectCrawl.findFirst({ where: { id: crawlId, prospectId: id, status: "completed" } });
    if (!crawl?.pdfData || !crawl.pdfFilename) return NextResponse.json({ error: "PDF no disponible." }, { status: 404 });
    return new Response(new Uint8Array(crawl.pdfData), { headers: {
      "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${crawl.pdfFilename.replace(/[\"\r\n]/g, "-")}"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  }
  const history = await prisma.prospectCrawl.findMany({ where: { prospectId: id }, orderBy: { createdAt: "desc" }, select: {
    id: true, ownerUsername: true, crawlOwnerUserId: true, siteUrl: true, crawlSiteRunId: true, projectId: true, status: true, error: true,
    summary: true, pdfFilename: true, createdAt: true,
  } });
  return NextResponse.json({ history: history.map((crawl) => ({ ...crawl, summaryText: summarizeCrawl(crawl.summary) })) });
}

export async function POST(request: NextRequest, { params }: Context) {
  if (!(await isAuthenticatedProspectCrawlRequest(request))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const retry = request.headers.get("x-crawl-retry") === "1";
  try {
    const crawl = await startProspectCrawl(id, retry);
    return NextResponse.json({ crawl: {
      id: crawl.id, ownerUsername: crawl.ownerUsername, siteUrl: crawl.siteUrl,
      crawlSiteRunId: crawl.crawlSiteRunId, projectId: crawl.projectId,
      status: crawl.status, error: crawl.error, summary: crawl.summary,
      pdfFilename: crawl.pdfFilename, createdAt: crawl.createdAt,
    } }, { status: crawl.status === "failed" ? 502 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error al iniciar el rastreo." }, { status: 400 });
  }
}
