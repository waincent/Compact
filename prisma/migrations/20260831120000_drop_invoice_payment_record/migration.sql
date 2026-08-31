-- 发票移除「关联核销」payment_record_id 字段,发票与资金记录彻底解耦
-- (外键约束 invoice_payment_record_id_fkey 随列删除自动移除)
DROP INDEX IF EXISTS "invoice_payment_record_id_idx";
ALTER TABLE "invoice" DROP COLUMN IF EXISTS "payment_record_id";
