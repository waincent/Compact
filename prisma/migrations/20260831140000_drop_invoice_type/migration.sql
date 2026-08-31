-- 发票移除「发票类型」字段(invoice_type),不再区分电子普票/专票,类型由合同 contract_type 推导
ALTER TABLE "invoice" DROP COLUMN IF EXISTS "invoice_type";
-- 同步清理已无引用的发票类型字典
DELETE FROM "sys_dict" WHERE dict_type = 'invoice_type';
