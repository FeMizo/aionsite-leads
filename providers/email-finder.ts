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
      return { html: "", fetchCount: 1 };
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return { html: "", fetchCount: 1 };
    }

    return {
      html: await response.text(),
      fetchCount: 1,
    };
  } catch {
    return { html: "", fetchCount: 1 };
  } finally {
    clearTimeout(timeout);
  }
}

export async function findEmailFromWebsite(website: string) {
  const url = sanitizeWebsiteUrl(website);

  if (!url) {
    return {
      email: "",
      fetchCount: 0,
    };
  }

  let fetchCount = 0;
  const homepage = await fetchHtml(url);
  fetchCount += homepage.fetchCount;

  if (!homepage.html) {
    return {
      email: "",
      fetchCount,
    };
  }

  const homepageEmails = extractEmails(homepage.html);

  if (homepageEmails.length) {
    return {
      email: homepageEmails[0],
      fetchCount,
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
      };
    }
  }

  return {
    email: "",
    fetchCount,
  };
}
