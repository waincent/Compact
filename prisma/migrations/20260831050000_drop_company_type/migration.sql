-- DropIndex
DROP INDEX "company_company_type_is_deleted_idx";

-- AlterTable
ALTER TABLE "company" DROP COLUMN "company_type";
