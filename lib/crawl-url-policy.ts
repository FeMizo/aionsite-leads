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
  "bit.ly",
  "bitly.com",
  "t.co",
  "tinyurl.com",
  "goo.gl",
  "ow.ly",
  "buff.ly",
  "is.gd",
  "rebrand.ly",
]);

function parseCrawlUrl(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.search = "";
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url;
  } catch {
    return null;
  }
}

export function normalizeCrawlUrl(value: string) {
  const url = parseCrawlUrl(value);
  if (!url) return null;
  return url.pathname === "/" ? url.origin : url.toString();
}

function blockedHost(value: string) {
  const hostname = value.toLowerCase().replace(/^www\./, "");
  return [...BLOCKED_CRAWL_HOSTS].find((blockedHost) => hostname === blockedHost || hostname.endsWith(`.${blockedHost}`)) || null;
}

export function getCrawlUrlBlockReason(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const url = parseCrawlUrl(raw);
    const blocked = url && blockedHost(url.hostname);
    if (blocked) return `No se permite rastrear enlaces de contacto o redes sociales (${blocked}).`;
  } catch {
    return null;
  }

  return null;
}

export function isCrawlUrlAllowed(value: string) {
  return !getCrawlUrlBlockReason(value);
}

export async function resolveCrawlUrl(value: string) {
  const normalized = normalizeCrawlUrl(value);
  if (!normalized) return null;
  const initial = new URL(normalized);
  const initialBlocked = blockedHost(initial.hostname);
  try {
    const response = await fetch(normalized, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    const resolved = normalizeCrawlUrl(response.url || normalized);
    if (resolved && (!initialBlocked || new URL(resolved).hostname !== initial.hostname)) return resolved;
  } catch {
    // A redirect is an optimization; the caller still validates the normalized URL.
  }
  return initialBlocked ? null : normalized;
}
