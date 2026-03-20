ALTER TABLE "Prospect"
ADD COLUMN "contacted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastContactedAt" TIMESTAMP(3),
ADD COLUMN "followupCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "Prospect"
SET "contacted" = true
WHERE "status" IN ('contacted', 'replied', 'closed');

UPDATE "Prospect"
SET "lastContactedAt" = COALESCE("updatedAt", "lastCheckedAt", "createdAt")
WHERE "contacted" = true
  AND "lastContactedAt" IS NULL;

UPDATE "Prospect"
SET "type" = 'restaurant'
WHERE LOWER("type") IN ('restaurant', 'restaurante');

UPDATE "Prospect"
SET "type" = 'inmobiliaria'
WHERE LOWER("type") IN ('inmobiliaria', 'real estate agency', 'real_estate_agency');

UPDATE "Prospect"
SET "type" = 'clinica'
WHERE LOWER("type") IN ('clinica', 'clinic', 'doctor');
