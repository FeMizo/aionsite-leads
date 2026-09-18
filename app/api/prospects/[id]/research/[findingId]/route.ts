import { NextResponse, type NextRequest } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { decideResearchFinding } from "@/lib/prospect-research";
import { isAuthenticatedProspectCrawlRequest } from "@/lib/prospect-crawl-auth";

type Context = { params: Promise<{ id: string; findingId: string }> };
export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: Context) {
  if (!(await isAuthenticatedProspectCrawlRequest(request))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id, findingId } = await params;
  const body = await request.json().catch(() => null) as { decision?: unknown } | null;
  if (body?.decision !== "approve" && body?.decision !== "dismiss") {
    return NextResponse.json({ error: "La decisión debe ser approve o dismiss." }, { status: 400 });
  }
  const prisma = getPrismaClient();
  const finding = await prisma.prospectResearchFinding.findFirst({ where: { id: findingId, research: { prospectId: id } } });
  if (!finding) return NextResponse.json({ error: "Propuesta no encontrada." }, { status: 404 });
  const credential = await prisma.dashboardCredential.findUnique({ where: { id: 1 }, select: { username: true } });
  try {
    const result = await decideResearchFinding(findingId, body.decision, credential?.username || "dashboard-admin");
    if (result.stale) return NextResponse.json({ error: "El dato cambió desde la investigación. Se registró como desactualizado; vuelve a investigar." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la decisión.";
    return NextResponse.json({ error: message }, { status: message.includes("ya tiene una decisión") ? 409 : 400 });
  }
}
