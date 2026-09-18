import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getEmailTrackingConfig } from "@/lib/env";

export type EmailTrackingToken = {
  kind: "open" | "click";
  prospectId: string;
  trackingId: string;
  url?: string;
};

const TOKEN_VERSION = 1;
const MAX_TOKEN_LENGTH = 12_000;

function getTrackingSettings() {
  const config = getEmailTrackingConfig();
  if (config.secret.length < 32 || !config.baseUrl) return null;
  try {
    const baseUrl = new URL(config.baseUrl);
    const local = baseUrl.hostname === "localhost" || baseUrl.hostname === "127.0.0.1";
    if (baseUrl.protocol !== "https:" && !(local && baseUrl.protocol === "http:")) return null;
    return { secret: config.secret, baseUrl: baseUrl.origin };
  } catch {
    return null;
  }
}

export function isEmailTrackingConfigured() {
  return Boolean(getTrackingSettings());
}

function getEncryptionKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function createEmailTrackingToken(payload: EmailTrackingToken) {
  const settings = getTrackingSettings();
  if (!settings || !payload.prospectId || !payload.trackingId) return "";
  if (payload.kind === "click") {
    if (!payload.url || payload.url.length > 2_000) return "";
    try {
      const target = new URL(payload.url);
      if (target.protocol !== "https:" && target.protocol !== "http:") return "";
    } catch {
      return "";
    }
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(settings.secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify({ v: TOKEN_VERSION, ...payload }), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function verifyEmailTrackingToken(token: string): EmailTrackingToken | null {
  const settings = getTrackingSettings();
  if (!settings || !token || token.length > MAX_TOKEN_LENGTH) return null;
  const [encodedIv, encodedTag, encodedCiphertext, extra] = token.split(".");
  if (!encodedIv || !encodedTag || !encodedCiphertext || extra !== undefined) return null;
  try {
    const iv = Buffer.from(encodedIv, "base64url");
    const tag = Buffer.from(encodedTag, "base64url");
    const ciphertext = Buffer.from(encodedCiphertext, "base64url");
    if (iv.length !== 12 || tag.length !== 16 || !ciphertext.length) return null;
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(settings.secret), iv);
    decipher.setAuthTag(tag);
    const cleartext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const decoded = JSON.parse(cleartext) as Partial<EmailTrackingToken> & { v?: number };
    if (decoded.v !== TOKEN_VERSION || (decoded.kind !== "open" && decoded.kind !== "click")) return null;
    if (typeof decoded.prospectId !== "string" || !decoded.prospectId || typeof decoded.trackingId !== "string" || !decoded.trackingId) return null;
    if (decoded.kind === "click") {
      if (typeof decoded.url !== "string") return null;
      const target = new URL(decoded.url);
      if (target.protocol !== "https:" && target.protocol !== "http:") return null;
    }
    return decoded as EmailTrackingToken;
  } catch {
    return null;
  }
}

function buildTrackingUrl(kind: "open" | "click", payload: EmailTrackingToken) {
  const settings = getTrackingSettings();
  const token = createEmailTrackingToken(payload);
  if (!settings || !token) return "";
  const url = new URL(`/api/tracking/${kind}`, settings.baseUrl);
  url.searchParams.set("t", token);
  return url.toString();
}

function decodeHtmlAttribute(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function rewriteHtmlLinks(html: string, prospectId: string, trackingId: string) {
  return html.replace(/\bhref=(['"])(https?:\/\/.*?)\1/gi, (attribute, quote: string, escapedUrl: string) => {
    const url = decodeHtmlAttribute(escapedUrl);
    const tracked = buildTrackingUrl("click", { kind: "click", prospectId, trackingId, url });
    return tracked ? `href=${quote}${tracked}${quote}` : attribute;
  });
}

function rewriteTextLinks(text: string, prospectId: string, trackingId: string) {
  return text.replace(/https?:\/\/[^\s<>]+/gi, (raw) => {
    const trailing = raw.match(/[.,!?)\]}]+$/)?.[0] || "";
    const url = trailing ? raw.slice(0, -trailing.length) : raw;
    const tracked = buildTrackingUrl("click", { kind: "click", prospectId, trackingId, url });
    return tracked ? `${tracked}${trailing}` : raw;
  });
}

export function addEmailTracking(html: string, text: string, prospectId: string, trackingId: string) {
  const pixelUrl = buildTrackingUrl("open", { kind: "open", prospectId, trackingId });
  if (!pixelUrl) return { html, text };
  const trackedHtml = rewriteHtmlLinks(html, prospectId, trackingId);
  const trackedText = rewriteTextLinks(text, prospectId, trackingId);
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" aria-hidden="true" style="display:none!important;width:1px;height:1px;border:0;" />`;
  return {
    html: trackedHtml.includes("</body>")
      ? trackedHtml.replace("</body>", `${pixel}</body>`)
      : `${trackedHtml}${pixel}`,
    text: trackedText,
  };
}

export function getEmailTrackingRedirectUrl(payload: EmailTrackingToken) {
  if (payload.kind !== "click" || !payload.url) return "";
  return payload.url;
}
