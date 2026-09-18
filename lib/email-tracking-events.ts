import type { Prisma } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/db";
import type { EmailTrackingToken } from "@/lib/email-tracking";

function getSafePath(value: string | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return `${url.origin}${url.pathname}`.slice(0, 1000);
  } catch {
    return "";
  }
}

export async function recordEmailTrackingEvent(token: EmailTrackingToken) {
  const prisma = getPrismaClient();
  const prospect = await prisma.prospect.findUnique({
    where: { id: token.prospectId },
    select: { id: true },
  });
  if (!prospect) return { recorded: false, duplicate: false };

  const eventType = token.kind === "open" ? "email_opened" : "email_clicked";
  const safePath = token.kind === "click" ? getSafePath(token.url) : "";
  const eventKey = token.kind === "open" ? token.trackingId : `${token.trackingId}:${safePath}`;
  const existing = await prisma.contactEvent.findFirst({
    where: {
      prospectId: token.prospectId,
      eventType,
      metadata: { path: ["trackingKey"], equals: eventKey },
    },
    select: { id: true },
  });
  if (existing) return { recorded: false, duplicate: true };

  const metadata: Prisma.InputJsonObject = {
    source: "self_hosted_tracking",
    trackingId: token.trackingId,
    trackingKey: eventKey,
    ...(safePath ? { clickedPath: safePath } : {}),
  };
  await prisma.contactEvent.create({
    data: { prospectId: token.prospectId, eventType, metadata },
  });
  return { recorded: true, duplicate: false };
}
