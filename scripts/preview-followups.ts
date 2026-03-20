import "dotenv/config";
import { listDueFollowups } from "@/lib/mailer";

async function main() {
  const items = await listDueFollowups();

  console.log(`[preview-followups] due=${items.length}`);
  console.log(JSON.stringify(items, null, 2));
}

main().catch((error) => {
  console.error(
    `[preview-followups] Error: ${error instanceof Error ? error.message : error}`
  );
  process.exitCode = 1;
});
