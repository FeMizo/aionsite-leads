import "dotenv/config";
import { sendDueFollowupEmails } from "@/lib/mailer";

async function main() {
  const result = await sendDueFollowupEmails();

  console.log(
    `[send-followups] due=${result.dueFollowups} sent=${result.followupsSent} failed=${result.failed} blocked=${result.blocked}`
  );
}

main().catch((error) => {
  console.error(
    `[send-followups] Error: ${error instanceof Error ? error.message : error}`
  );
  process.exitCode = 1;
});
