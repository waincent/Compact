-- 基础数据字典
-- 背景:正式环境容器启动仅执行 prisma migrate deploy(建表),从不执行 seed,
-- 导致 sys_dict 表为空,前端 useDicts 查不到字典,getLabel 回退为数字字符串,
-- 页面出现「合同类型/项目状态/用户角色/用户状态」直接显示数字。
-- 本迁移把 5 类基础字典作为初始数据随迁移应用;ON CONFLICT 幂等,已存在的字典行跳过。

INSERT INTO "sys_dict" ("dict_type", "dict_label", "dict_value", "sort_order", "status") VALUES
  ('company_status', '正常', '1', 0, 1),
  ('company_status', '停用', '0', 1, 1),
  ('project_status', '进行中', '1', 0, 1),
  ('project_status', '结项', '2', 1, 1),
  ('contract_type', '销售', '1', 0, 1),
  ('contract_type', '采购', '2', 1, 1),
  ('user_role', '超级管理员', '1', 0, 1),
  ('user_role', '管理员', '2', 1, 1),
  ('user_role', '财务', '3', 2, 1),
  ('user_role', '普通成员', '4', 3, 1),
  ('user_status', '启用', '1', 0, 1),
  ('user_status', '停用', '0', 1, 1)
ON CONFLICT ("dict_type", "dict_value") DO NOTHING;
