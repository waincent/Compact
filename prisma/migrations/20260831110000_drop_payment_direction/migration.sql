-- 资金记录移除「收款/付款」direction 字段,方向由合同 contract_type 推导
-- 销售合同(contract_type=1)→ 收款;采购合同(contract_type=2)→ 付款
DROP INDEX IF EXISTS "payment_record_contract_id_direction_idx";
ALTER TABLE "payment_record" DROP COLUMN IF EXISTS "direction";
