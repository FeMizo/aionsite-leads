import { recordEmailTrackingEvent } from "@/lib/email-tracking-events";
import { verifyEmailTrackingToken } from "@/lib/email-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PIXEL = Buffer.from("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", "base64");

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t") || "";
  const payload = verifyEmailTrackingToken(token);
  if (payload?.kind === "open") {
    try {
      await recordEmailTrackingEvent(payload);
    } catch {
      // Keep the tracking image transparent even if storage is temporarily unavailable.
    }
  }
  return new Response(PIXEL, {
    status: 200,
    headers: {
      "content-type": "image/gif",
      "content-length": String(PIXEL.length),
      "cache-control": "private, no-store, no-cache, max-age=0, must-revalidate",
      pragma: "no-cache",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}
