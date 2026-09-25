import { describe, expect, it } from "vitest";
import {
  CRM_PROMPT_VERSION,
  getCrmPrompt,
  listCrmPrompts,
  classifyReply,
} from "@/lib/crm-prompts";

describe("CRM prompt library", () => {
  it("exposes versioned prompts for the complete response workflow", () => {
    const prompts = listCrmPrompts();

    expect(prompts.length).toBeGreaterThanOrEqual(6);
    expect(new Set(prompts.map((prompt) => prompt.id)).size).toBe(prompts.length);
    expect(prompts.every((prompt) => prompt.version === CRM_PROMPT_VERSION)).toBe(true);
    expect(getCrmPrompt("personalized-outreach").template).toContain("evidencia");
  });

  it("classifies replies without triggering an outbound action", () => {
    expect(classifyReply("Sí, mándame la propuesta y agendamos una llamada")).toBe("interesado");
    expect(classifyReply("Ahora no, escríbeme el próximo mes")).toBe("no_ahora");
    expect(classifyReply("Por favor no me contacten nuevamente")).toBe("baja");
  });
});
