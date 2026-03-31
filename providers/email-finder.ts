import { normalizeEmail, normalizeWebsite } from "@/lib/normalizers";

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const CONTACT_HINTS = ["contact", "contacto", "about", "nosotros", "empresa"];
const SOCIAL_HOSTS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "wa.me",
  "linktr.ee",
];

export type WebsiteAudit = {
  fetchFailed: boolean;
  loadTimeMs: number | null;
  hasWhatsappCta: boolean;
  hasContactCta: boolean;
  isMobileFriendly: boolean | null;
};

function sanitizeWebsiteUrl(website: string) {
  const raw = String(website || "").trim();
  const normalized = normalizeWebsite(website);

  if (!normalized) {
    return "";
  }

  if (SOCIAL_HOSTS.some((host) => normalized.includes(host))) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  return `https://${normalized}`;
}

function extractEmails(text: string) {
  const matches = text.match(EMAIL_REGEX) || [];
  return Array.from(
    new Set(
      matches
        .map((email) => normalizeEmail(email))
        .filter((email) => email && !email.endsWith(".png"))
    )
  );
}

function extractContactLinks(html: string, baseUrl: string) {
  const matches = Array.from(
    html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi),
    (match) => match[1]
  );
  const links: string[] = [];

  for (const href of matches) {
    try {
      const url = new URL(href, baseUrl);

      if (url.origin !== new URL(baseUrl).origin) {
        continue;
      }

      if (!CONTACT_HINTS.some((hint) => url.pathname.toLowerCase().includes(hint))) {
        continue;
      }

      links.push(url.toString());
    } catch {
      continue;
    }
  }

  return Array.from(new Set(links)).slice(0, 3);
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "aionsite-leads/2.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      return { html: "", fetchCount: 1, ok: false, durationMs: Date.now() - startedAt };
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return { html: "", fetchCount: 1, ok: false, durationMs: Date.now() - startedAt };
    }

    return {
      html: await response.text(),
      fetchCount: 1,
      ok: true,
      durationMs: Date.now() - startedAt,
    };
  } catch {
    return { html: "", fetchCount: 1, ok: false, durationMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timeout);
  }
}

function auditWebsiteHtml(
  html: string,
  metadata: { fetchFailed: boolean; loadTimeMs: number | null }
): WebsiteAudit {
  if (!html) {
    return {
      fetchFailed: metadata.fetchFailed,
      loadTimeMs: metadata.loadTimeMs,
      hasWhatsappCta: false,
      hasContactCta: false,
      isMobileFriendly: null,
    };
  }

  const normalizedHtml = html.toLowerCase();
  const hasWhatsappCta =
    normalizedHtml.includes("wa.me/") ||
    normalizedHtml.includes("api.whatsapp.com") ||
    normalizedHtml.includes("whatsapp");
  const hasContactCta =
    hasWhatsappCta ||
    /href\s*=\s*["'](?:mailto:|tel:)/i.test(html) ||
    /(contacto|contact|cotiza|cotizacion|agendar|agenda|reserva|reservar|cita|llamar|escribenos)/i.test(
      html
    );
  const isMobileFriendly = /<meta[^>]+name=["']viewport["']/i.test(html);

  return {
    fetchFailed: metadata.fetchFailed,
    loadTimeMs: metadata.loadTimeMs,
    hasWhatsappCta,
    hasContactCta,
    isMobileFriendly,
  };
}

export async function findEmailFromWebsite(website: string) {
  const url = sanitizeWebsiteUrl(website);

  if (!url) {
    return {
      email: "",
      fetchCount: 0,
      audit: {
        fetchFailed: false,
        loadTimeMs: null,
        hasWhatsappCta: false,
        hasContactCta: false,
        isMobileFriendly: null,
      } satisfies WebsiteAudit,
    };
  }

  let fetchCount = 0;
  const homepage = await fetchHtml(url);
  fetchCount += homepage.fetchCount;
  const audit = auditWebsiteHtml(homepage.html, {
    fetchFailed: !homepage.ok,
    loadTimeMs: homepage.durationMs,
  });

  if (!homepage.html) {
    return {
      email: "",
      fetchCount,
      audit,
    };
  }

  const homepageEmails = extractEmails(homepage.html);

  if (homepageEmails.length) {
    return {
      email: homepageEmails[0],
      fetchCount,
      audit,
    };
  }

  const contactLinks = extractContactLinks(homepage.html, url);

  for (const link of contactLinks) {
    const page = await fetchHtml(link);
    fetchCount += page.fetchCount;
    const emails = extractEmails(page.html);

    if (emails.length) {
      return {
        email: emails[0],
        fetchCount,
        audit,
      };
    }
  }

  return {
    email: "",
    fetchCount,
    audit,
  };
}
