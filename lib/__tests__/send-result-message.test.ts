import { describe, expect, it } from "vitest";
import { getActionSuccessMessage } from "@/lib/send-result-message";

describe("send result summaries", () => {
  it("reports failures and blocks alongside successful sends", () => {
    const message = getActionSuccessMessage("/api/send", { result: { sent: 2, blocked: 3, failed: 1 } });
    expect(message).toContain("Se enviaron 2 correos.");
    expect(message).toContain("3 bloqueados y 1 fallidos");
  });
  it("reports failures alongside scheduled messages", () => {
    const message = getActionSuccessMessage("/api/send", { result: { scheduledCreated: 2, failed: 1 } });
    expect(message).toContain("Se programaron 2 correos");
    expect(message).toContain("1 fallidos");
  });
  it("includes followups in the sent count", () => {
    expect(getActionSuccessMessage("/api/send", { result: { sent: 1, followupsSent: 2 } })).toBe("Se enviaron 3 correos.");
  });
  it("does not report sends for empty results or unrelated actions", () => {
    expect(getActionSuccessMessage("/api/send", { result: {} })).toContain("No había correos");
    expect(getActionSuccessMessage("/api/prospects", { result: { failed: 2 } })).toBe("Acción completada.");
  });
  it("reports blocked-only outcomes without claiming a send", () => {
    const message = getActionSuccessMessage("/api/send", { result: { blocked: 2 } });
    expect(message).toContain("No se enviaron correos.");
    expect(message).toContain("2 bloqueados");
  });
});
