-- 移除合同状态概念与合同变更履历
DROP TABLE IF EXISTS "contract_change_log";
ALTER TABLE "contract" DROP COLUMN IF EXISTS "status";
DELETE FROM "sys_dict" WHERE dict_type = 'contract_status';
