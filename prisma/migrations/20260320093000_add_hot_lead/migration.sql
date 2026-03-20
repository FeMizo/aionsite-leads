ALTER TABLE "Prospect"
ADD COLUMN IF NOT EXISTS "hotLead" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Prospect"
SET "hotLead" = true
WHERE "status" = 'replied';
