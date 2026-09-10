export const DASHBOARD_SESSION_COOKIE = "aionsite_dashboard_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function encode(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
}

async function sign(value: string) {
  const secret = process.env.INTERNAL_API_KEY?.trim();
  if (!secret) return "";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return encode(String.fromCharCode(...new Uint8Array(signature)));
}

export async function createDashboardSession(username: string) {
  const payload = encode(JSON.stringify({ username, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS }));
  const signature = await sign(payload);
  return signature ? `${payload}.${signature}` : "";
}

export async function verifyDashboardSession(token: string) {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature || (await sign(payload)) !== signature) return false;
    const data = JSON.parse(decode(payload)) as { username?: string; exp?: number };
    return Boolean(data.username && typeof data.exp === "number" && data.exp > Date.now() / 1000);
  } catch {
    return false;
  }
}

export const dashboardSessionCookieOptions = {
  maxAge: SESSION_MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
};
