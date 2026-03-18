import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";
import { isDatabaseConfigured } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __aionsitePrisma__: PrismaClient | undefined;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL?.trim();

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
