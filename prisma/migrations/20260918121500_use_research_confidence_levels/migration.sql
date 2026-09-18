ALTER TABLE "ProspectResearchFinding"
DROP COLUMN "confidenceScore",
ADD COLUMN "confidenceReason" TEXT NOT NULL DEFAULT '';
