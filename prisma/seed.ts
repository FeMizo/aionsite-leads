import "dotenv/config";
import { importLegacyJsonData } from "@/lib/legacy-import";

async function main() {
  const result = await importLegacyJsonData();

  if (result.skipped) {
    console.log("[seed] Base de datos con datos existentes. Se omite importacion legacy.");
    return;
  }

  console.log(
    `[seed] Prospectos importados: ${result.importedProspects}. Eventos importados: ${result.importedEvents}.`
  );
}

main().catch((error) => {
  console.error(`[seed] Error: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
