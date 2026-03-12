const { normalizeEmail, normalizeWebsite } = require("../utils/normalizers");

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

function sanitizeWebsiteUrl(website) {
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

function extractEmails(text) {
  const matches = text.match(EMAIL_REGEX) || [];
  return Array.from(
    new Set(
      matches
        .map((email) => normalizeEmail(email))
        .filter((email) => email && !email.endsWith(".png"))
    )
  );
}

function extractContactLinks(html, baseUrl) {
  const matches = Array.from(
    html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi),
    (match) => match[1]
  );
  const links = [];

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
    } catch (error) {
      continue;
    }
  }

  return Array.from(new Set(links)).slice(0, 3);
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "aionsite-leads/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      return "";
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return "";
    }

    return await response.text();
  } catch (error) {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

async function findEmailFromWebsite(website) {
  const url = sanitizeWebsiteUrl(website);

  if (!url) {
    return "";
  }

  const homepage = await fetchHtml(url);

  if (!homepage) {
    return "";
  }

  const homepageEmails = extractEmails(homepage);

  if (homepageEmails.length) {
    return homepageEmails[0];
  }

  const contactLinks = extractContactLinks(homepage, url);

  for (const link of contactLinks) {
    const html = await fetchHtml(link);
    const emails = extractEmails(html);

    if (emails.length) {
      return emails[0];
    }
  }

  return "";
}

module.exports = {
  findEmailForWebsite: findEmailFromWebsite,
  findEmailFromWebsite,
};
