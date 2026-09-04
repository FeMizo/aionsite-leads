import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { ProspectStatus, Prisma } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/db";
import { getImapHost, getImapPass, getImapPort, getImapSecure, getImapUser, isImapConfigured } from "@/lib/env";
import { normalizeEmail } from "@/lib/normalizers";

const BOUNCE_STATUS: ProspectStatus = "uncontactable";
const BOUNCE_STATUSES: ProspectStatus[] = ["contacted", "followup"];

export type BounceScanResult = { configured: boolean; scanned: number; bounced: number; prospects: string[] };

function extractEmails(value: string) {
  return [...new Set(value.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi) || [])]
    .map(normalizeEmail).filter(Boolean);
}

function isBounce(subject: string, source: string) {
  const normalizedSubject = subject.toLowerCase().replace(/\s+/g, " ").trim();
  const normalizedSource = source.toLowerCase();
  return normalizedSubject.includes("undelivered mail returned to sender") ||
    (normalizedSource.includes("delivery-status") && normalizedSource.includes("final-recipient") && normalizedSource.includes("status: 5."));
}

export async function scanMailboxForBounces(): Promise<BounceScanResult> {
  if (!isImapConfigured()) return { configured: false, scanned: 0, bounced: 0, prospects: [] };

  const prisma = getPrismaClient();
  const prospects = await prisma.prospect.findMany({
    where: { status: { in: BOUNCE_STATUSES } },
    select: { id: true, email: true, normalizedEmail: true, status: true },
  });
  const byEmail = new Map(prospects.map((prospect) => [normalizeEmail(prospect.normalizedEmail || prospect.email), prospect] as const).filter(([email]) => Boolean(email)));
  const result: BounceScanResult = { configured: true, scanned: 0, bounced: 0, prospects: [] };
  const client = new ImapFlow({ host: getImapHost(), port: Number(getImapPort()), secure: getImapSecure(), auth: { user: getImapUser(), pass: getImapPass() }, logger: false });

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const uids = await client.search({ seen: false, since }, { uid: true });
    if (uids === false) return result;
    for await (const message of client.fetch(uids, { uid: true, envelope: true, source: true }, { uid: true })) {
      result.scanned += 1;
      const source = message.source?.toString("utf8") || "";
      const subject = message.envelope?.subject || "";
      if (!isBounce(subject, source)) continue;
      const parsed = await simpleParser(message.source || source);
      const matches = extractEmails(`${source}\n${parsed.text || ""}`).map((email) => byEmail.get(email)).filter((prospect): prospect is NonNullable<typeof prospect> => Boolean(prospect));
      for (const prospect of matches) {
        const now = new Date();
        const messageId = parsed.messageId || `imap:${message.uid}`;
        await prisma.$transaction([
          prisma.prospect.update({ where: { id: prospect.id }, data: { status: BOUNCE_STATUS, contacted: false, scheduledSendAt: null, lastCheckedAt: now, lastError: "Undelivered Mail Returned to Sender", lastMessageId: messageId } }),
          prisma.contactEvent.create({ data: { prospectId: prospect.id, eventType: "email_bounced", metadata: { fromStatus: prospect.status, toStatus: BOUNCE_STATUS, subject, messageId, recipient: normalizeEmail(prospect.email) } as Prisma.InputJsonObject, createdAt: now } }),
        ]);
        result.bounced += 1;
        result.prospects.push(prospect.id);
      }
      await client.messageFlagsAdd(message.uid, ["\\Seen"], { uid: true });
    }
  } finally {
    lock.release();
    await client.logout().catch(() => undefined);
  }
  return result;
}
