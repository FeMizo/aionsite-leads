import "dotenv/config";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { getDatabaseUrl } from "./lib/env";

config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDatabaseUrl(),
  },
});
