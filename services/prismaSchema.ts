// /services/prismaSchema.ts

import fs from "fs";
import path from "path";

let cachedSchema: string | null = null;

export function getPrismaSchema(): string {
  if (cachedSchema) return cachedSchema;

  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");

  cachedSchema = fs.readFileSync(schemaPath, "utf-8");

  return cachedSchema;
}
