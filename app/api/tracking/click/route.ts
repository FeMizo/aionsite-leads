import { recordEmailTrackingEvent } from "@/lib/email-tracking-events";
import { getEmailTrackingRedirectUrl, verifyEmailTrackingToken } from "@/lib/email-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t") || "";
  const payload = verifyEmailTrackingToken(token);
  if (payload?.kind !== "click") {
    return new Response("Enlace inválido.", { status: 404, headers: { "cache-control": "no-store" } });
  }

  try {
    await recordEmailTrackingEvent(payload);
  } catch {
    // Continue to the signed destination if event storage is temporarily unavailable.
  }

  const destination = getEmailTrackingRedirectUrl(payload);
  if (!destination) return new Response("Enlace inválido.", { status: 404 });
  return new Response(null, {
    status: 302,
    headers: {
      location: destination,
      "cache-control": "private, no-store, no-cache, max-age=0, must-revalidate",
      "referrer-policy": "no-referrer",
    },
  });
}
