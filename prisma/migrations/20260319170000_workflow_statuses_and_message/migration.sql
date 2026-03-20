ALTER TABLE "Prospect"
ADD COLUMN IF NOT EXISTS "subject" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "message" TEXT NOT NULL DEFAULT '';

ALTER TYPE "ProspectStatus" RENAME TO "ProspectStatus_old";

CREATE TYPE "ProspectStatus" AS ENUM (
  'generated',
  'analyzed',
  'approved',
  'ready',
  'contacted',
  'replied',
  'closed',
  'rejected'
);

ALTER TABLE "Prospect"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Prospect"
ALTER COLUMN "status" TYPE "ProspectStatus"
USING (
  CASE "status"::text
    WHEN 'generated' THEN 'generated'
    WHEN 'prospect' THEN 'approved'
    WHEN 'analyzed' THEN 'analyzed'
    WHEN 'approved' THEN 'approved'
    WHEN 'ready' THEN 'ready'
    WHEN 'contacted' THEN 'contacted'
    WHEN 'failed' THEN 'rejected'
    WHEN 'replied' THEN 'replied'
    WHEN 'closed' THEN 'closed'
    WHEN 'archived' THEN 'rejected'
    WHEN 'deleted' THEN 'rejected'
    WHEN 'rejected' THEN 'rejected'
    ELSE 'generated'
  END
)::"ProspectStatus";

ALTER TABLE "Prospect"
ALTER COLUMN "status" SET DEFAULT 'generated';

DROP TYPE "ProspectStatus_old";
