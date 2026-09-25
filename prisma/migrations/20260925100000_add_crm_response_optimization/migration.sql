ALTER TABLE "Prospect"
  ADD COLUMN "segmentIdeal" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "painPoint" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "evidence" JSONB,
  ADD COLUMN "recommendedOffer" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "nextAction" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "owner" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "nextFollowupAt" TIMESTAMP(3),
  ADD COLUMN "fitScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "urgencyScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "contactabilityScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "activityScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "promptVersion" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "responseCategory" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "meetingAt" TIMESTAMP(3),
  ADD COLUMN "proposalAt" TIMESTAMP(3),
  ADD COLUMN "closedAt" TIMESTAMP(3),
  ADD COLUMN "revenue" DOUBLE PRECISION;

CREATE INDEX "Prospect_nextFollowupAt_idx" ON "Prospect"("nextFollowupAt");
CREATE INDEX "Prospect_responseCategory_idx" ON "Prospect"("responseCategory");
