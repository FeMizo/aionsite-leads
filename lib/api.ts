import { getApiErrorMessage } from "@/lib/api-client";

type SuccessPayload = Record<string, unknown>;

function buildJsonHeaders(init?: ResponseInit) {
  const headers = new Headers(init?.headers);

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }

  return headers;
}

export function ok(data: SuccessPayload = {}, init?: ResponseInit) {
  return new Response(
    JSON.stringify({
      ok: true,
      ...data,
    }),
    {
      ...init,
      headers: buildJsonHeaders(init),
    }
  );
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details: unknown = null
) {
  return new Response(
    JSON.stringify({
      ok: false,
      error: {
        code,
        message,
        details,
      },
    }),
    {
      status,
      headers: buildJsonHeaders(),
    },
  );
}

export function getErrorMessage(payload: unknown, fallback: string) {
  return getApiErrorMessage(payload, fallback);
}
