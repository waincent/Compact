-- 发票移除红冲概念:删除 original_invoice_id 列(及索引/FK),允许直接删除单个发票
-- 历史数据处理:被红冲的原票恢复为「已开票」,红冲票(RF)软删除
DROP INDEX IF EXISTS "invoice_original_invoice_id_idx";
ALTER TABLE "invoice" DROP COLUMN IF EXISTS "original_invoice_id";

-- 字典移除「已红冲」(invoice_status 仅剩 已开票=1 / 已认证抵扣=3)
DELETE FROM "sys_dict" WHERE dict_type = 'invoice_status' AND dict_value = '2';

-- 被红冲的原票(正数、状态=已红冲)恢复为已开票
UPDATE "invoice" SET status = 1, updated_at = now() WHERE status = 2 AND amount > 0;
-- 红冲票(负数金额)软删除
UPDATE "invoice" SET is_deleted = true, deleted_at = now() WHERE amount < 0;

-- 清理红冲编号序列
DELETE FROM "sys_sequence" WHERE "bizKey" = 'RF-2026';
