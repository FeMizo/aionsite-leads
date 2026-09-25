export type ProspectLanguage = "es" | "en" | "pt" | "it";

export function normalizeProspectLanguage(value: string | null | undefined): ProspectLanguage {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("pt")) return "pt";
  if (normalized.startsWith("it")) return "it";
  return "es";
}

export function inferProspectLanguage(city: string | null | undefined): ProspectLanguage {
  const normalized = String(city || "").toLowerCase();
  if (/miami|orlando|houston|los angeles|san diego|united states|estados unidos/.test(normalized)) return "en";
  if (/lisbon|lisboa|portugal/.test(normalized)) return "pt";
  if (/milan|milano|italy|italia/.test(normalized)) return "it";
  return "es";
}
