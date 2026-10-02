import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { getPrismaClient } from "@/lib/db";

const MAX_PER_RUN = 5;
const MIN_PER_RUN = 2;

function randomTarget() {
  return MIN_PER_RUN + Math.floor(Math.random() * (MAX_PER_RUN - MIN_PER_RUN + 1));
}

function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  if (digits.startsWith("521") && digits.length === 13) return `52${digits.slice(3)}`;
  return digits;
}

function buildMessage(prospect: { contactName: string; opportunity: string; city: string }) {
  const greeting = prospect.contactName ? ` ${prospect.contactName}` : "";
  const context = prospect.opportunity.trim()
    ? ` Vi una oportunidad relacionada con ${prospect.opportunity.trim().replace(/[\r\n]+/g, " ")}.`
    : ` Vi el negocio en ${prospect.city || "su ciudad"} y detecté una oportunidad para mejorar su presencia digital.`;
  return `Hola${greeting}, soy Felipe de AionSite.${context} ¿Te puedo enviar una propuesta breve sin compromiso?`;
}

async function waitForComposer(page: Page) {
  const composer = page.locator('div[contenteditable="true"][role="textbox"]').last();
  await composer.waitFor({ state: "visible", timeout: 20_000 });
  return composer;
}

async function sendMessage(page: Page, phone: string, body: string) {
  await page.goto(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(body)}`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  const composer = await waitForComposer(page);
  const sendButton = page.locator('[data-testid="send"]').last();
  if (await sendButton.isVisible().catch(() => false)) await sendButton.click();
  else await composer.press("Enter");
  await page.waitForTimeout(1_000);
}

async function openWhatsApp(): Promise<{ browser?: Browser; context: BrowserContext; page: Page }> {
  const cdpUrl = process.env.WHATSAPP_CDP_URL;
  if (cdpUrl) {
    const browser = await chromium.connectOverCDP(cdpUrl);
    const context = browser.contexts()[0] ?? await browser.newContext();
    const page = context.pages().find((item) => item.url().includes("web.whatsapp.com")) ?? await context.newPage();
    return { browser, context, page };
  }

  const profileDir = process.env.WHATSAPP_PROFILE_DIR || path.join(process.cwd(), ".data", "whatsapp-profile");
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1440, height: 1000 },
  });
  const page = context.pages()[0] ?? await context.newPage();
  return { context, page };
}

async function main() {
  const prisma = getPrismaClient();
  const target = randomTarget();
  let sent = 0;
  let failed = 0;
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;

  try {
    const prospects = await prisma.prospect.findMany({
      where: { status: "ready", contacted: false, email: "", phone: { not: "" } },
      orderBy: [{ fitScore: "desc" }, { createdAt: "asc" }],
      take: target,
      select: { id: true, contactName: true, opportunity: true, city: true, phone: true },
    });

    if (!prospects.length) {
      console.log(JSON.stringify({ target, eligible: 0, sent: 0, failed: 0, reason: "no_whatsapp_prospects" }));
      return;
    }

    const opened = await openWhatsApp();
    browser = opened.browser;
    context = opened.context;
    const page = opened.page;
    await page.goto("https://web.whatsapp.com", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.locator('div[contenteditable="true"][role="textbox"]').first().waitFor({ state: "visible", timeout: 30_000 });

    for (const prospect of prospects) {
      const phone = normalizeWhatsAppPhone(prospect.phone);
      if (phone.length < 12) {
        failed += 1;
        continue;
      }

      const body = buildMessage(prospect);
      try {
        await sendMessage(page, phone, body);
        const now = new Date();
        await prisma.$transaction([
          prisma.prospect.update({
            where: { id: prospect.id },
            data: { status: "contacted", contacted: true, lastContactedAt: now, followupStage: 1, lastCheckedAt: now, lastError: "" },
          }),
          prisma.contactEvent.create({
            data: { prospectId: prospect.id, eventType: "whatsapp_sent", metadata: { phone, body, channel: "whatsapp_web" } },
          }),
        ]);
        sent += 1;
      } catch (error) {
        failed += 1;
        await prisma.contactEvent.create({
          data: {
            prospectId: prospect.id,
            eventType: "whatsapp_send_failed",
            metadata: { phone, channel: "whatsapp_web", error: error instanceof Error ? error.message : "unknown_error" },
          },
        });
      }
    }

    console.log(JSON.stringify({ target, eligible: prospects.length, sent, failed }));
  } finally {
    if (context && !process.env.WHATSAPP_KEEP_OPEN) await context.close();
    else if (browser && !process.env.WHATSAPP_KEEP_OPEN) await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
