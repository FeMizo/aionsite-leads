import { NextResponse, type NextRequest } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { decodeResearchValue, runProspectResearch } from "@/lib/prospect-research";
import { isAuthenticatedProspectCrawlRequest } from "@/lib/prospect-crawl-auth";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest, { params }: Context) {
  if (!(await isAuthenticatedProspectCrawlRequest(request))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const prisma = getPrismaClient();
  const exists = await prisma.prospect.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Prospecto no encontrado." }, { status: 404 });
  const researches = await prisma.prospectResearch.findMany({
    where: { prospectId: id }, orderBy: { createdAt: "desc" }, take: 20,
    include: { findings: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json({ researches: researches.map((research) => ({
    ...research,
    startedAt: research.startedAt.toISOString(),
    completedAt: research.completedAt?.toISOString() || null,
    createdAt: research.createdAt.toISOString(),
    findings: research.findings.map((finding) => ({
      ...finding, currentValue: decodeResearchValue(finding.currentValue),
      proposedValue: decodeResearchValue(finding.proposedValue),
      decidedAt: finding.decidedAt?.toISOString() || null, createdAt: finding.createdAt.toISOString(),
    })),
  })) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest, { params }: Context) {
  if (!(await isAuthenticatedProspectCrawlRequest(request))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  try {
    const research = await runProspectResearch(id);
    return NextResponse.json({ researchId: research.id, status: research.status, findingCount: research.findings.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo investigar el prospecto.";
    return NextResponse.json({ error: message }, { status: message === "Prospecto no encontrado." ? 404 : 500 });
  }
}
