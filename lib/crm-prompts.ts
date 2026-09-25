export const CRM_PROMPT_VERSION = "2026-09-25-v1";

export type CrmPromptId =
  | "business-research"
  | "opportunity-qualification"
  | "personalized-outreach"
  | "subject-variants"
  | "reply-classification"
  | "weekly-optimization";

export type ReplyCategory = "interesado" | "objecion" | "no_ahora" | "referido" | "baja" | "otro";

export type CrmPrompt = {
  id: CrmPromptId;
  version: string;
  label: string;
  template: string;
};

const PROMPTS: readonly CrmPrompt[] = [
  {
    id: "business-research",
    version: CRM_PROMPT_VERSION,
    label: "Investigar negocio",
    template:
      "Analiza este negocio con evidencia verificable. Devuelve: problema digital, oportunidad comercial, evidencia, confianza y fuente.",
  },
  {
    id: "opportunity-qualification",
    version: CRM_PROMPT_VERSION,
    label: "Calificar oportunidad",
    template:
      "Con estos datos, decide si vale contactar ahora. Explica ajuste, urgencia, canal recomendado y razón.",
  },
  {
    id: "personalized-outreach",
    version: CRM_PROMPT_VERSION,
    label: "Redactar primer contacto",
    template:
      "Redacta un mensaje mexicano, breve y específico. Menciona una evidencia u observación real, una mejora concreta y pide una conversación de 15 minutos.",
  },
  {
    id: "subject-variants",
    version: CRM_PROMPT_VERSION,
    label: "Generar asuntos",
    template:
      "Genera tres asuntos de máximo 7 palabras: directo, consultivo y basado en oportunidad.",
  },
  {
    id: "reply-classification",
    version: CRM_PROMPT_VERSION,
    label: "Clasificar respuesta",
    template:
      "Clasifica esta respuesta como interesado, objeción, no ahora, referido, baja u otro. Propón el siguiente paso mínimo, sin enviar nada automáticamente.",
  },
  {
    id: "weekly-optimization",
    version: CRM_PROMPT_VERSION,
    label: "Optimizar semanalmente",
    template:
      "Compara resultados de los últimos 30 días y recomienda qué nichos, mensajes y señales conservar o eliminar.",
  },
];

export function listCrmPrompts() {
  return PROMPTS.map((prompt) => ({ ...prompt }));
}

export function getCrmPrompt(id: CrmPromptId) {
  const prompt = PROMPTS.find((item) => item.id === id);

  if (!prompt) {
    throw new Error(`Prompt CRM no encontrado: ${id}`);
  }

  return { ...prompt };
}

export function classifyReply(message: string): ReplyCategory {
  const value = message.trim().toLocaleLowerCase("es-MX");

  if (!value) return "otro";
  if (/(no me contacten|no contactar|dar de baja|eliminarme|unsubscribe)/i.test(value)) return "baja";
  if (/(te refiero|habla con|contacta a|mi socio|la persona indicada)/i.test(value)) return "referido";
  if (/(ahora no|más adelante|proximo mes|próximo mes|después|despues)/i.test(value)) return "no_ahora";
  if (/(pero|sin presupuesto|caro|ya tenemos|no necesitamos|duda|pregunta)/i.test(value)) return "objecion";
  if (/(sí|si|interesa|propuesta|agend|llamada|cotiza|mándame|mandame)/i.test(value)) return "interesado";

  return "otro";
}
