-- Stage QC toggle. Existing work orders keep the old behaviour (OFF); new ones default to ON.
ALTER TABLE "WorkOrder" ADD COLUMN "stageQc" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkOrder" ALTER COLUMN "stageQc" SET DEFAULT true;
