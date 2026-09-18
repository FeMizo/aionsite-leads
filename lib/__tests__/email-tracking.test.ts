import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prospectFindUnique: vi.fn(),
  contactEventFindFirst: vi.fn(),
  contactEventCreate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getPrismaClient: () => ({
  prospect: { findUnique: mocks.prospectFindUnique },
  contactEvent: { findFirst: mocks.contactEventFindFirst, create: mocks.contactEventCreate },
}) }));

import { GET as openPixel } from "@/app/api/tracking/open/route";
import { GET as clickRedirect } from "@/app/api/tracking/click/route";
import { createEmailTrackingToken } from "@/lib/email-tracking";

const secret = "test-secret-with-at-least-32-characters";

beforeEach(() => {
  vi.stubEnv("EMAIL_TRACKING_SECRET", secret);
  vi.stubEnv("EMAIL_TRACKING_BASE_URL", "https://leads.example.com");
  mocks.prospectFindUnique.mockResolvedValue({ id: "prospect-1" });
  mocks.contactEventFindFirst.mockResolvedValue(null);
  mocks.contactEventCreate.mockResolvedValue({ id: "event-1" });
});

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("self-hosted email tracking", () => {
  it("records a verified open and returns a non-cacheable pixel", async () => {
    const token = createEmailTrackingToken({ kind: "open", prospectId: "prospect-1", trackingId: "mail-1" });
    const response = await openPixel(new Request(`https://leads.example.com/api/tracking/open?t=${token}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/gif");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.contactEventCreate.mock.calls[0][0].data).toMatchObject({
      eventType: "email_opened",
      metadata: { trackingId: "mail-1", trackingKey: "mail-1" },
    });
  });

  it("redirects only to a signed destination and stores no query string", async () => {
    const token = createEmailTrackingToken({ kind: "click", prospectId: "prospect-1", trackingId: "mail-2", url: "https://client.example/contact?email=private#form" });
    const response = await clickRedirect(new Request(`https://leads.example.com/api/tracking/click?t=${token}`));
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://client.example/contact?email=private#form");
    expect(mocks.contactEventCreate.mock.calls[0][0].data).toMatchObject({
      eventType: "email_clicked",
      metadata: { clickedPath: "https://client.example/contact", trackingKey: "mail-2:https://client.example/contact" },
    });
  });

  it("does not record repeats for the same email and tracked link", async () => {
    mocks.contactEventFindFirst.mockResolvedValue({ id: "existing" });
    const token = createEmailTrackingToken({ kind: "open", prospectId: "prospect-1", trackingId: "mail-3" });
    await openPixel(new Request(`https://leads.example.com/api/tracking/open?t=${token}`));
    expect(mocks.contactEventCreate).not.toHaveBeenCalled();
  });

  it("rejects tampered tracking tokens and invalid redirect destinations", async () => {
    const token = createEmailTrackingToken({ kind: "click", prospectId: "prospect-1", trackingId: "mail-4", url: "https://client.example/" });
    const parts = token.split(".");
    parts[2] = `${parts[2][0] === "a" ? "b" : "a"}${parts[2].slice(1)}`;
    const response = await clickRedirect(new Request(`https://leads.example.com/api/tracking/click?t=${parts.join(".")}`));
    expect(response.status).toBe(404);
    expect(mocks.contactEventCreate).not.toHaveBeenCalled();

    expect(createEmailTrackingToken({ kind: "click", prospectId: "p", trackingId: "m", url: "javascript:alert(1)" })).toBe("");
  });

  it("encrypts prospect and destination details inside the tracking token", () => {
    const token = createEmailTrackingToken({ kind: "click", prospectId: "internal-prospect-id", trackingId: "mail-5", url: "https://client.example/path?private=value" });
    expect(token).not.toContain("internal-prospect-id");
    expect(token).not.toContain("client.example");
  });
});
