CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Task" (
  id TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES "User"(id),
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  "structuredRequirement" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_status_idx ON "Task"(status);
CREATE INDEX IF NOT EXISTS task_created_idx ON "Task"("createdAt");

CREATE TABLE IF NOT EXISTS "Workflow" (
  id TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  definition JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PLANNED',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workflow_task_idx ON "Workflow"("taskId");

CREATE TABLE IF NOT EXISTS "Source" (
  id TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  metadata JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS source_task_idx ON "Source"("taskId");
CREATE INDEX IF NOT EXISTS source_url_idx ON "Source"(url);

CREATE TABLE IF NOT EXISTS "Dataset" (
  id TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dataset_task_idx ON "Dataset"("taskId");

CREATE TABLE IF NOT EXISTS "Record" (
  id TEXT PRIMARY KEY,
  "datasetId" TEXT NOT NULL REFERENCES "Dataset"(id) ON DELETE CASCADE,
  "sourceId" TEXT REFERENCES "Source"(id),
  data JSONB NOT NULL,
  "validationStatus" TEXT NOT NULL DEFAULT 'PARTIAL',
  "validationErrors" JSONB,
  confidence DOUBLE PRECISION DEFAULT 1.0,
  "dedupeKey" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS record_dataset_idx ON "Record"("datasetId");
CREATE INDEX IF NOT EXISTS record_source_idx ON "Record"("sourceId");
CREATE INDEX IF NOT EXISTS record_validation_idx ON "Record"("validationStatus");
CREATE INDEX IF NOT EXISTS record_dedupe_idx ON "Record"("dedupeKey");

CREATE TABLE IF NOT EXISTS "ExecutionLog" (
  id TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  metadata JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS log_task_idx ON "ExecutionLog"("taskId");
CREATE INDEX IF NOT EXISTS log_created_idx ON "ExecutionLog"("createdAt");
