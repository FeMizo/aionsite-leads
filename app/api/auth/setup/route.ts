import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { getDashboardCredential, hashDashboardPassword } from "@/lib/dashboard-auth";
import { getPrismaClient } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (await getDashboardCredential()) return fail("DASHBOARD_ALREADY_CONFIGURED", "El dashboard ya está configurado.", 409);
    const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string };
    const username = body.username?.trim() || "";
    const password = body.password || "";
    if (username.length < 3 || password.length < 12) return fail("INVALID_DASHBOARD_CREDENTIALS", "Usa un usuario de 3+ caracteres y una contraseña de 12+ caracteres.", 400);
    await getPrismaClient().dashboardCredential.create({ data: { id: 1, username, passwordHash: await hashDashboardPassword(password) } });
    return ok();
  } catch (error) {
    return fail("DASHBOARD_SETUP_FAILED", error instanceof Error ? error.message : "No se pudo configurar el dashboard.", 500);
  }
}
