// scripts/generate-schema-json.ts
// Genera un JSON base con estructura inferida del schema de Prisma.
// Campos de tipo enum referencian el enum por nombre — sin duplicar valores.

import { getPrismaSchema } from "../services/prismaSchema";

const TYPE_DEFAULTS: Record<string, unknown> = {
  String: "",
  Int: 0,
  Float: 0,
  Boolean: false,
  DateTime: null,
  Json: null,
};

function parseEnums(schema: string): Record<string, string[]> {
  const enums: Record<string, string[]> = {};
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  let match;
  while ((match = enumRegex.exec(schema)) !== null) {
    const values = match[2]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//"));
    enums[match[1]] = values;
  }
  return enums;
}

function parseModels(
  schema: string,
  enums: Record<string, string[]>
): Record<string, Record<string, unknown>> {
  const models: Record<string, Record<string, unknown>> = {};
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let match;

  while ((match = modelRegex.exec(schema)) !== null) {
    const modelName = match[1];
    const fields: Record<string, unknown> = {};

    for (const line of match[2].split("\n").map((l) => l.trim()).filter(Boolean)) {
      if (line.startsWith("@@") || line.startsWith("//")) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;

      const fieldName = parts[0];
      const rawType = parts[1].replace("?", "").replace("[]", "");
      const isOptional = parts[1].includes("?");
      const isArray = parts[1].includes("[]");
      const isEnum = enums.hasOwnProperty(rawType);
      const isScalar = TYPE_DEFAULTS.hasOwnProperty(rawType);

      // Skip relation fields
      if (!isScalar && !isEnum) continue;

      if (isEnum) {
        // Reference the enum — don't repeat its values here
        const defaultMatch = line.match(/@default\((.+?)\)(?:\s|$)/);
        fields[fieldName] = {
          $enum: rawType,
          default: defaultMatch ? defaultMatch[1].trim() : enums[rawType][0],
        };
      } else if (isArray) {
        fields[fieldName] = [];
      } else if (isOptional) {
        fields[fieldName] = null;
      } else {
        const defaultMatch = line.match(/@default\((.+?)\)(?:\s|$)/);
        if (defaultMatch) {
          const raw = defaultMatch[1].trim();
          if (raw === "now()" || raw === "autoincrement()" || raw === "cuid()" || raw === "uuid()") {
            fields[fieldName] = TYPE_DEFAULTS[rawType];
          } else if (raw === "true") fields[fieldName] = true;
          else if (raw === "false") fields[fieldName] = false;
          else if (!isNaN(Number(raw))) fields[fieldName] = Number(raw);
          else fields[fieldName] = raw.replace(/^"(.*)"$/, "$1");
        } else {
          fields[fieldName] = TYPE_DEFAULTS[rawType] ?? null;
        }
      }
    }

    models[modelName] = fields;
  }

  return models;
}

function main() {
  const schema = getPrismaSchema();
  const enums = parseEnums(schema);
  const models = parseModels(schema, enums);

  console.log(
    JSON.stringify(
      {
        _meta: {
          generatedAt: new Date().toISOString(),
          source: "prisma/schema.prisma",
          note: "Campos con $enum referencian la sección enums. Sin duplicados.",
        },
        enums,
        models,
      },
      null,
      2
    )
  );
}

main();
