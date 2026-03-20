ALTER TABLE "Prospect"
ADD COLUMN "followupStage" INTEGER NOT NULL DEFAULT 0;

UPDATE "Prospect"
SET "followupStage" = CASE
  WHEN "contacted" = true THEN 1
  ELSE 0
END
WHERE "followupStage" = 0;
