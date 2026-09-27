-- Deleting a Task cascades to Workflow/Source/Dataset (already ON DELETE CASCADE).
-- Dataset cascades to Record. Record.sourceId previously had no ON DELETE action
-- (defaults to NO ACTION), which could raise a foreign key violation when a
-- Source row is cascade-deleted while a Record still referenced it in the same
-- statement. Switch it to SET NULL: the Record row itself is already being
-- removed via the Dataset cascade in the same delete, so this is purely
-- defensive — it makes "delete task" safe to run in one statement.
ALTER TABLE "Record" DROP CONSTRAINT "Record_sourceId_fkey";
ALTER TABLE "Record" ADD CONSTRAINT "Record_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "Source"(id) ON DELETE SET NULL;
