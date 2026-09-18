import type { NextRequest } from "next/server";
import { DASHBOARD_SESSION_COOKIE, verifyDashboardSession } from "@/lib/dashboard-session";

export async function isAuthenticatedProspectCrawlRequest(request: NextRequest) {
  const token = request.cookies.get(DASHBOARD_SESSION_COOKIE)?.value || "";
  return token ? verifyDashboardSession(token) : false;
}
