-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('generated', 'prospect', 'contacted', 'failed', 'replied', 'closed', 'archived', 'deleted');

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "normalizedEmail" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "normalizedPhone" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "website" TEXT NOT NULL DEFAULT '',
    "rating" TEXT NOT NULL DEFAULT '',
    "mapsUrl" TEXT NOT NULL DEFAULT '',
    "opportunity" TEXT NOT NULL DEFAULT '',
    "recommendedSite" TEXT NOT NULL DEFAULT '',
    "pitchAngle" TEXT NOT NULL DEFAULT '',
    "status" "ProspectStatus" NOT NULL DEFAULT 'generated',
    "source" TEXT NOT NULL DEFAULT 'google-places',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessStatus" TEXT NOT NULL DEFAULT '',
    "lastError" TEXT NOT NULL DEFAULT '',
    "lastMessageId" TEXT NOT NULL DEFAULT '',
    "runId" TEXT,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactEvent" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "searchesCount" INTEGER NOT NULL,
    "placesFound" INTEGER NOT NULL,
    "duplicatesFiltered" INTEGER NOT NULL,
    "emailsFound" INTEGER NOT NULL,
    "prospectsSaved" INTEGER NOT NULL,
    "googlePlacesRequests" INTEGER NOT NULL,
    "websiteFetches" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prospect_status_createdAt_idx" ON "Prospect"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Prospect_runId_idx" ON "Prospect"("runId");

-- CreateIndex
CREATE INDEX "Prospect_normalizedEmail_idx" ON "Prospect"("normalizedEmail");

-- CreateIndex
CREATE INDEX "Prospect_normalizedPhone_idx" ON "Prospect"("normalizedPhone");

-- CreateIndex
CREATE INDEX "Prospect_normalizedName_idx" ON "Prospect"("normalizedName");

-- CreateIndex
CREATE INDEX "ContactEvent_prospectId_createdAt_idx" ON "ContactEvent"("prospectId", "createdAt");

-- CreateIndex
CREATE INDEX "Run_createdAt_idx" ON "Run"("createdAt");

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactEvent" ADD CONSTRAINT "ContactEvent_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
