ALTER TABLE "Prospect"
ADD COLUMN "formattedAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN "userRatingCount" INTEGER;

CREATE TABLE "ProspectResearch" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "sourceResults" JSONB,
    "error" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProspectResearch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProspectResearchFinding" (
    "id" TEXT NOT NULL,
    "researchId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "currentValue" TEXT NOT NULL DEFAULT 'null',
    "proposedValue" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "confidenceReason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decision" TEXT NOT NULL DEFAULT '',
    "decidedBy" TEXT NOT NULL DEFAULT '',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProspectResearchFinding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProspectResearch_prospectId_createdAt_idx" ON "ProspectResearch"("prospectId", "createdAt");
CREATE INDEX "ProspectResearch_status_createdAt_idx" ON "ProspectResearch"("status", "createdAt");
CREATE INDEX "ProspectResearchFinding_researchId_status_idx" ON "ProspectResearchFinding"("researchId", "status");
CREATE INDEX "ProspectResearchFinding_field_createdAt_idx" ON "ProspectResearchFinding"("field", "createdAt");

ALTER TABLE "ProspectResearch"
ADD CONSTRAINT "ProspectResearch_prospectId_fkey"
FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProspectResearchFinding"
ADD CONSTRAINT "ProspectResearchFinding_researchId_fkey"
FOREIGN KEY ("researchId") REFERENCES "ProspectResearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
