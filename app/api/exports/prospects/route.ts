import { NextRequest, NextResponse } from "next/server";
import { requireBearer } from "@/lib/auth";
import { formatMissingEnvError, DATABASE_ENV_KEYS } from "@/lib/env";
import { exportProspectsWorkbook } from "@/lib/prospect-export";
import { DASHBOARD_SESSION_COOKIE, verifyDashboardSession } from "@/lib/dashboard-session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authError = requireBearer(request);
  if (authError) {
    const session = request.cookies.get(DASHBOARD_SESSION_COOKIE)?.value || "";
    if (!session || !(await verifyDashboardSession(session))) return authError;
  }
  const configError = formatMissingEnvError("la base de datos", DATABASE_ENV_KEYS);
  if (configError) return NextResponse.json({ error: configError }, { status: 503 });

  try {
    const buffer = await exportProspectsWorkbook();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="aionsite-prospectos-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo exportar el Excel." }, { status: 500 });
  }
}
