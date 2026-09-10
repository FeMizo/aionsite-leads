import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { getDashboardCredential, verifyDashboardPassword } from "@/lib/dashboard-auth";
import { createDashboardSession, DASHBOARD_SESSION_COOKIE, dashboardSessionCookieOptions } from "@/lib/dashboard-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const credential = await getDashboardCredential();
    if (!credential) return fail("DASHBOARD_NOT_CONFIGURED", "Primero configura el dashboard.", 409);
    const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string };
    const valid = body.username?.trim() === credential.username && await verifyDashboardPassword(body.password || "", credential.passwordHash);
    if (!valid) return fail("DASHBOARD_UNAUTHORIZED", "Usuario o contraseña incorrectos.", 401);
    const token = await createDashboardSession(credential.username);
    if (!token) return fail("DASHBOARD_SESSION_FAILED", "Falta INTERNAL_API_KEY para firmar la sesión.", 503);
    const response = ok();
    response.headers.append("Set-Cookie", `${DASHBOARD_SESSION_COOKIE}=${token}; Max-Age=${dashboardSessionCookieOptions.maxAge}; Path=/; HttpOnly; SameSite=Lax${dashboardSessionCookieOptions.secure ? "; Secure" : ""}`);
    return response;
  } catch (error) {
    return fail("DASHBOARD_LOGIN_FAILED", error instanceof Error ? error.message : "No se pudo iniciar sesión.", 500);
  }
}
