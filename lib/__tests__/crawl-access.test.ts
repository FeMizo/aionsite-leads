import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DASHBOARD_SESSION_COOKIE, createDashboardSession } from "@/lib/dashboard-session";
import { isAuthenticatedProspectCrawlRequest } from "@/lib/prospect-crawl-auth";

afterEach(() => vi.unstubAllEnvs());

describe("crawl history access", () => {
  it("rejects unauthenticated history and PDF requests", async () => {
    vi.stubEnv("INTERNAL_API_KEY", "internal-test-key");
    expect(await isAuthenticatedProspectCrawlRequest(new NextRequest("https://leads.test/api/prospects/p1/crawl"))).toBe(false);
  });

  it("accepts a valid dashboard session cookie without exposing a server secret", async () => {
    vi.stubEnv("INTERNAL_API_KEY", "internal-test-key");
    const session = await createDashboardSession("dashboard-owner");
    const valid = new NextRequest("https://leads.test/api/prospects/p1/crawl", {
      headers: { cookie: `${DASHBOARD_SESSION_COOKIE}=${session}` },
    });
    expect(await isAuthenticatedProspectCrawlRequest(valid)).toBe(true);
  });
});
