-- AlterTable: 公司新增「公司地址」「公司电话」
ALTER TABLE "company" ADD COLUMN "address" VARCHAR(200);
ALTER TABLE "company" ADD COLUMN "phone" VARCHAR(20);
