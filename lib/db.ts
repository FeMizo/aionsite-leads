import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";
import { getDatabaseUrl, isDatabaseConfigured } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __aionsitePrisma__: PrismaClient | undefined;
}

function normalizeDatabaseConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");

    // Keep current pg behavior explicit and avoid the deprecation warning.
    if (sslMode === "require" || sslMode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
    }

    return url.toString();
  } catch {
    return connectionString;
  }
}

function createPrismaClient() {
  const connectionString = normalizeDatabaseConnectionString(getDatabaseUrl());

  if (!connectionString) {
    throw new Error("DATABASE_URL no esta configurada.");
  }

  const adapter = new PrismaPg({
    connectionString,
  });

  return new PrismaClient({
    adapter,
    log: ["warn", "error"],
  });
}

export function getPrismaClient(): PrismaClient {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL no esta configurada.");
  }

  if (!globalThis.__aionsitePrisma__) {
    globalThis.__aionsitePrisma__ = createPrismaClient();
  }

  return globalThis.__aionsitePrisma__;
}
