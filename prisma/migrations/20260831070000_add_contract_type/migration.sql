-- AlterTable: 合同移除「我方身份」,新增「合同类型」(1=销售 2=采购)
ALTER TABLE "contract" DROP COLUMN "our_party_role";
ALTER TABLE "contract" ADD COLUMN "contract_type" INTEGER NOT NULL DEFAULT 1;
