-- 发票移除「销项/进项」direction 字段,方向由合同 contract_type 推导
-- 销售合同(contract_type=1)→ 销项;采购合同(contract_type=2)→ 进项
DROP INDEX IF EXISTS "invoice_contract_id_direction_idx";
ALTER TABLE "invoice" DROP COLUMN IF EXISTS "direction";
