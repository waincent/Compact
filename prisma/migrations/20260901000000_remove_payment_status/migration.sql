-- DropIndex
DROP INDEX "payment_record_is_deleted_status_idx";

-- AlterTable
ALTER TABLE "payment_record" DROP COLUMN "status";

-- CreateIndex
CREATE INDEX "payment_record_is_deleted_idx" ON "payment_record"("is_deleted");
