import { NextRequest, NextResponse } from "next/server";
import { DASHBOARD_SESSION_COOKIE, verifyDashboardSession } from "@/lib/dashboard-session";

export async function proxy(request: NextRequest) {
  const session = request.cookies.get(DASHBOARD_SESSION_COOKIE)?.value;
  if (!session || !(await verifyDashboardSession(session))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(request.headers);
  const internalApiKey = process.env.INTERNAL_API_KEY?.trim();
  if (internalApiKey) requestHeaders.set("authorization", `Bearer ${internalApiKey}`);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: "/dashboard/:path*",
};
