-- DropForeignKey
ALTER TABLE "Record" DROP CONSTRAINT "Record_sourceId_fkey";

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
