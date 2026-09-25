const BLOCKED_CRAWL_HOSTS = new Set([
  "wa.me",
  "whatsapp.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "linktr.ee",
]);

export function getCrawlUrlBlockReason(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    for (const blockedHost of BLOCKED_CRAWL_HOSTS) {
      if (hostname === blockedHost || hostname.endsWith(`.${blockedHost}`)) {
        return `No se permite rastrear enlaces de contacto o redes sociales (${blockedHost}).`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function isCrawlUrlAllowed(value: string) {
  return !getCrawlUrlBlockReason(value);
}
