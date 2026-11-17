ALTER TABLE "WorkOrder" ADD COLUMN "partName" TEXT;

-- Backfill from the finished good description already captured as jobDescription
UPDATE "WorkOrder" SET "partName" = "jobDescription" WHERE "partName" IS NULL;
