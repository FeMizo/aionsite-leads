function stripDiacritics(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeEmail(email) {
  return normalizeWhitespace(email).toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function normalizeName(name) {
  return normalizeWhitespace(
    stripDiacritics(name)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s]/g, " ")
  );
}

function normalizeWebsite(website) {
  return normalizeWhitespace(website)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

module.exports = {
  normalizeEmail,
  normalizeName,
  normalizePhone,
  normalizeWebsite,
  normalizeWhitespace,
  stripDiacritics,
};
