export function stripDiacritics(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeWhitespace(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function normalizeEmail(email: string) {
  return normalizeWhitespace(email).toLowerCase();
}

export function normalizePhone(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

export function normalizeName(name: string) {
  return normalizeWhitespace(
    stripDiacritics(name)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s]/g, " ")
  );
}

export function normalizeWebsite(website: string) {
  return normalizeWhitespace(website)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}
