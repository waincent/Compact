-- AlterTable: 项目移除「项目负责人」字段(含索引与外键)
-- 用 IF EXISTS 兼容首次部分应用后残留的状态(外键已删)
ALTER TABLE "project" DROP CONSTRAINT IF EXISTS "project_manager_id_fkey";
DROP INDEX IF EXISTS "project_manager_id_is_deleted_idx";
ALTER TABLE "project" DROP COLUMN IF EXISTS "manager_id";
