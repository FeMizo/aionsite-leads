import "dotenv/config";
import { importLegacyJsonData } from "@/lib/legacy-import";

async function main() {
  const result = await importLegacyJsonData();

  if (result.skipped) {
    console.log(
      "[migrate-legacy] Ya existen prospectos en Postgres. Usa una DB vacia o limpia antes de reimportar."
    );
    return;
  }

  console.log(
    `[migrate-legacy] Prospectos importados: ${result.importedProspects}. Eventos importados: ${result.importedEvents}.`
  );
}

main().catch((error) => {
  console.error(
    `[migrate-legacy] Error: ${error instanceof Error ? error.message : error}`
  );
  process.exitCode = 1;
});
