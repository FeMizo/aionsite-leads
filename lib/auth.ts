import type { NextRequest } from "next/server";
import { fail } from "@/lib/api";

export function requireBearer(request: NextRequest) {
  const internalApiKey = process.env.INTERNAL_API_KEY?.trim();

  if (!internalApiKey) {
    return fail(
      "INTERNAL_API_KEY_MISSING",
      "INTERNAL_API_KEY no esta configurada.",
      503
    );
  }

  const authorization = request.headers.get("authorization") || "";
  const expected = `Bearer ${internalApiKey}`;

  if (authorization !== expected) {
    return fail(
      "UNAUTHORIZED",
      "Authorization bearer invalido o ausente.",
      401
    );
  }

  return null;
}
