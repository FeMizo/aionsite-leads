import type { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { fail } from "@/lib/api";
import { DASHBOARD_SESSION_COOKIE } from "@/lib/dashboard-session";

function isValidDashboardSession(request: NextRequest, secret: string) {
  const token = request.cookies.get(DASHBOARD_SESSION_COOKIE)?.value || "";
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return false;
  }

  try {
    const expected = createHmac("sha256", secret).update(payload).digest();
    const received = Buffer.from(signature, "base64url");

    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      return false;
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      username?: unknown;
      exp?: unknown;
    };

    return (
      typeof decoded.username === "string" &&
      decoded.username.length > 0 &&
      typeof decoded.exp === "number" &&
      decoded.exp > Date.now() / 1000
    );
  } catch {
    return false;
  }
}

export function requireBearer(request: NextRequest) {
  const internalApiKey = process.env.INTERNAL_API_KEY?.trim();

  if (!internalApiKey) {
    return fail(
      "INTERNAL_API_KEY_MISSING",
      "INTERNAL_API_KEY no está configurada.",
      503
    );
  }

  const authorization = request.headers.get("authorization") || "";
  const expected = `Bearer ${internalApiKey}`;

  if (authorization !== expected && !isValidDashboardSession(request, internalApiKey)) {
    return fail(
      "UNAUTHORIZED",
      "Authorization bearer invalido o ausente.",
      401
    );
  }

  return null;
}
