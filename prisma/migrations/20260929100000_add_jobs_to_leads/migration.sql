CREATE TYPE "JobStatus" AS ENUM (
  'pendiente',
  'para_aplicar',
  'aplicado',
  'skipeado',
  'no_entra_en_planes',
  'no_disponible',
  'follow_up',
  'en_espera',
  'rechazado',
  'bloqueado',
  'guardado_para_despues'
);

CREATE TABLE "JobSettings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "profile" JSONB NOT NULL,
  "searchCriteria" JSONB NOT NULL,
  "lastJobsSearchAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Job" (
  "id" TEXT NOT NULL,
  "dbId" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "salaryLabel" TEXT NOT NULL,
  "salaryCurrency" TEXT NOT NULL,
  "salaryUsdMin" DOUBLE PRECISION,
  "salaryUsdMax" DOUBLE PRECISION,
  "fitReason" TEXT NOT NULL,
  "checkedAt" TIMESTAMP(3) NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL,
  "zone" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "link" TEXT NOT NULL,
  "stack" JSONB NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'pendiente',
  "cover" TEXT NOT NULL,
  "notes" TEXT NOT NULL,
  "lastTouchedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Job_dbId_key" ON "Job"("dbId");
CREATE UNIQUE INDEX "Job_link_key" ON "Job"("link");
CREATE INDEX "Job_status_addedAt_idx" ON "Job"("status", "addedAt");
CREATE INDEX "Job_source_addedAt_idx" ON "Job"("source", "addedAt");
CREATE INDEX "Job_company_title_idx" ON "Job"("company", "title");
