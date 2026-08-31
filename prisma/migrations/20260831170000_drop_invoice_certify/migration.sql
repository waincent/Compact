-- 发票移除「认证抵扣」:字典删已认证抵扣(3),存量已认证抵扣发票恢复为已开票(1)
DELETE FROM "sys_dict" WHERE dict_type = 'invoice_status' AND dict_value = '3';
UPDATE "invoice" SET status = 1, updated_at = now() WHERE status = 3;
