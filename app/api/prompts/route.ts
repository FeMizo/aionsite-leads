import { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { requireBearer } from "@/lib/auth";
import { listCrmPrompts } from "@/lib/crm-prompts";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authError = requireBearer(request);
  if (authError) return authError;
  return ok({ prompts: listCrmPrompts() });
}
