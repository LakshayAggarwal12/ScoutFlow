-- RenameIndex
ALTER INDEX "dataset_task_idx" RENAME TO "Dataset_taskId_idx";

-- RenameIndex
ALTER INDEX "log_created_idx" RENAME TO "ExecutionLog_createdAt_idx";

-- RenameIndex
ALTER INDEX "log_task_idx" RENAME TO "ExecutionLog_taskId_idx";

-- RenameIndex
ALTER INDEX "record_dataset_idx" RENAME TO "Record_datasetId_idx";

-- RenameIndex
ALTER INDEX "record_dedupe_idx" RENAME TO "Record_dedupeKey_idx";

-- RenameIndex
ALTER INDEX "record_source_idx" RENAME TO "Record_sourceId_idx";

-- RenameIndex
ALTER INDEX "source_status_idx" RENAME TO "Source_status_idx";

-- RenameIndex
ALTER INDEX "source_task_idx" RENAME TO "Source_taskId_idx";

-- RenameIndex
ALTER INDEX "source_url_idx" RENAME TO "Source_url_idx";

-- RenameIndex
ALTER INDEX "task_created_idx" RENAME TO "Task_createdAt_idx";

-- RenameIndex
ALTER INDEX "workflow_task_idx" RENAME TO "Workflow_taskId_idx";
