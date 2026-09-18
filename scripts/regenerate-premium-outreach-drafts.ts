import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const ACTIVE_STATUSES = ["generated", "analyzed", "approved", "ready"] as const;

async function main() {
  const apply = process.argv.includes("--apply");
  if (process.argv.some((argument) => argument !== "--apply" && argument !== process.argv[0] && argument !== process.argv[1])) {
    throw new Error("Uso: tsx scripts/regenerate-premium-outreach-drafts.ts [--apply]");
  }
  const [{ getPrismaClient }, { buildProspectOutreachDraft }] = await Promise.all([
    import("@/lib/db"),
    import("@/lib/outreach"),
  ]);
  const prisma = getPrismaClient();
  try {
    const prospects = await prisma.prospect.findMany({
      where: { contacted: false, status: { in: [...ACTIVE_STATUSES] } },
      orderBy: { createdAt: "asc" },
    });
    console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", eligible: prospects.length }));
    if (!apply) return;

    let updated = 0;
    for (const prospect of prospects) {
      const draft = buildProspectOutreachDraft(prospect);
      const changed = await prisma.$transaction(async (tx) => {
        const result = await tx.prospect.updateMany({
          where: { id: prospect.id, contacted: false, status: { in: [...ACTIVE_STATUSES] } },
          data: { subject: draft.subject, message: draft.message },
        });
        if (result.count !== 1) return 0;
        await tx.contactEvent.create({
          data: {
            prospectId: prospect.id,
            eventType: "premium_draft_regenerated",
            metadata: {
              fromStatus: prospect.status,
              toStatus: prospect.status,
              note: "Unsent outreach draft regenerated with the premium AionSite copy; status and schedule preserved.",
            },
          },
        });
        return 1;
      });
      updated += changed;
    }
    console.log(JSON.stringify({ mode: "apply", updated, skippedChangedDuringRun: prospects.length - updated, emailsSent: 0 }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "No se pudieron regenerar los borradores.");
  process.exitCode = 1;
});
