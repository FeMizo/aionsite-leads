import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prospectFindUnique: vi.fn(),
  crawlFindFirst: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  prospectUpdate: vi.fn(),
  eventCreate: vi.fn(),
  sendMail: vi.fn(),
  createTransport: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getPrismaClient: () => ({
  prospect: { findUnique: mocks.prospectFindUnique },
  prospectCrawl: { findFirst: mocks.crawlFindFirst },
  $transaction: (callback: (tx: unknown) => unknown) => callback({
    prospect: { findUniqueOrThrow: mocks.findUniqueOrThrow, update: mocks.prospectUpdate },
    contactEvent: { create: mocks.eventCreate },
  }),
}) }));
vi.mock("nodemailer", () => ({ default: { createTransport: mocks.createTransport } }));
vi.mock("@/lib/send-scheduler", () => ({
  countEmailsSentToday: vi.fn(), getNextAvailableScheduledSendAt: vi.fn(),
  isGoodTimeToSend: vi.fn(() => true), isScheduledSendDue: vi.fn(() => true),
  MAX_PER_DAY: 100, MAX_PER_RUN: 100, sortProspectsForDelivery: vi.fn(),
}));

import { sendProspectEmailById } from "@/lib/mailer";

const prospect = {
  id: "p1", email: "owner@example.com", subject: "Revisión de sitio", message: "Hola, revisé su sitio.",
  status: "ready", contacted: false, crawlSiteRunId: "run-1", lastMessageId: "", city: "Tijuana",
  followupStage: 0, scheduledSendAt: null,
};

beforeEach(() => {
  vi.stubEnv("SMTP_HOST", "smtp.example.test");
  vi.stubEnv("SMTP_PORT", "587");
  vi.stubEnv("SMTP_USER", "sender@example.test");
  vi.stubEnv("SMTP_PASS", "test-smtp-password");
  vi.stubEnv("FROM_NAME", "AionSite");
  vi.stubEnv("FROM_EMAIL", "sender@example.test");
  mocks.prospectFindUnique.mockResolvedValue(prospect);
  mocks.crawlFindFirst.mockResolvedValue({
    status: "completed", summary: { total: 4, withIssues: 1, stats: { "404": 1 } },
    pdfData: Buffer.from("%PDF-1.4 test"), pdfFilename: "crawl-summary.pdf",
  });
  mocks.findUniqueOrThrow.mockResolvedValue(prospect);
  mocks.prospectUpdate.mockResolvedValue({});
  mocks.eventCreate.mockResolvedValue({});
  mocks.sendMail.mockResolvedValue({ messageId: "mock-message-id" });
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
});

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("prospect crawl report in email", () => {
  it("attaches the saved PDF and includes only crawl-supported findings and impact", async () => {
    await sendProspectEmailById({ prospectId: "p1", subject: "Revisión", message: "Hola." });
    const mail = mocks.sendMail.mock.calls[0][0];
    expect(mail.attachments).toEqual([{ filename: "crawl-summary.pdf", content: Buffer.from("%PDF-1.4 test") }]);
    expect(mail.text).toContain("Se revisaron 4 páginas");
    expect(mail.text).toContain("Enlaces a páginas inexistentes");
    expect(mail.text).toContain("observado en 1 página");
    expect(mail.text).toContain("efectos descritos son potenciales");
    expect(mail.text).toContain("Informe PDF adjunto: crawl-summary.pdf");
    expect(mail.html).toContain("Resumen de la revisión");
    expect(mail.html).toContain("#ffffff");
    expect(mail.html).toContain("Platicar con AionSite");
    expect(mail.html).toContain('href="tel:+529381573988"');
    expect(mail.html).toContain("+52 938 157 3988");
    expect(mail.text).toContain("Teléfono: +52 938 157 3988");
  });

  it("escapes prospect-written content in the premium HTML email", async () => {
    mocks.prospectFindUnique.mockResolvedValue({
      ...prospect,
      message: "Hola <script>alert('x')</script>\n\nVisita https://example.com/info",
    });

    await sendProspectEmailById({ prospectId: "p1", subject: "Revisión", message: "Hola <script>alert('x')</script>\n\nVisita https://example.com/info" });
    const mail = mocks.sendMail.mock.calls[0][0];
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain('href="https://example.com/info"');
  });

  it("does not send a prospect email while its crawl PDF is pending or missing", async () => {
    mocks.crawlFindFirst.mockResolvedValue({ status: "pending", pdfData: null, pdfFilename: "" });
    await expect(sendProspectEmailById({ prospectId: "p1", subject: "Revisión", message: "Hola." })).rejects.toThrow("no se envió el correo");
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});
