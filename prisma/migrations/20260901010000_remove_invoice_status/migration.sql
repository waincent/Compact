-- DropIndex
DROP INDEX "invoice_is_deleted_status_idx";

-- AlterTable
ALTER TABLE "invoice" DROP COLUMN "status";

-- CreateIndex
CREATE INDEX "invoice_is_deleted_idx" ON "invoice"("is_deleted");
