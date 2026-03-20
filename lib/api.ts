import { NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-client";

type SuccessPayload = Record<string, unknown>;

export function ok(data: SuccessPayload = {}, init?: ResponseInit) {
  return NextResponse.json(
    {
      ok: true,
      ...data,
    },
    init
  );
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details: unknown = null
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

export function getErrorMessage(payload: unknown, fallback: string) {
  return getApiErrorMessage(payload, fallback);
}
