-- Task: background-job tracking + cooperative cancellation
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "retryCount" INT NOT NULL DEFAULT 0;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "cancelRequested" BOOLEAN NOT NULL DEFAULT false;

-- Source: health/status tracking
ALTER TABLE "Source" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
ALTER TABLE "Source" ADD COLUMN IF NOT EXISTS "checkedAt" TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS source_status_idx ON "Source"(status);

-- Dataset: basic versioning + explicit mock-data labeling
ALTER TABLE "Dataset" ADD COLUMN IF NOT EXISTS "version" INT NOT NULL DEFAULT 1;
ALTER TABLE "Dataset" ADD COLUMN IF NOT EXISTS "usedMockData" BOOLEAN NOT NULL DEFAULT false;
