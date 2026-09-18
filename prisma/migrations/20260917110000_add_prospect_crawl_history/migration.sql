CREATE TABLE "ProspectCrawl" (
  "id" TEXT NOT NULL,
  "prospectId" TEXT NOT NULL,
  "ownerUsername" TEXT NOT NULL DEFAULT '',
  "crawlOwnerUserId" TEXT NOT NULL DEFAULT '',
  "siteUrl" TEXT NOT NULL,
  "crawlSiteRunId" TEXT NOT NULL DEFAULT '',
  "projectId" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attemptCount" INTEGER NOT NULL DEFAULT 1,
  "error" TEXT NOT NULL DEFAULT '',
  "summary" JSONB,
  "pdfFilename" TEXT NOT NULL DEFAULT '',
  "pdfData" BYTEA,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProspectCrawl_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProspectCrawl_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProspectCrawl_crawlSiteRunId_idx" ON "ProspectCrawl"("crawlSiteRunId");
CREATE INDEX "ProspectCrawl_status_createdAt_idx" ON "ProspectCrawl"("status", "createdAt");
CREATE UNIQUE INDEX "ProspectCrawl_one_active_per_site_idx" ON "ProspectCrawl"("prospectId", "siteUrl") WHERE "status" IN ('pending', 'running');
