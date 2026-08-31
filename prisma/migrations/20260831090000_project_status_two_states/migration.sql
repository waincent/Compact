-- 项目状态精简为「进行中=1」「结项=2」(原:1立项 2进行中 3验收 4结项 5暂停)
-- 立项/进行中/暂停 → 进行中;验收/结项 → 结项
UPDATE "project" SET "status" = 1 WHERE "status" IN (1, 2, 5);
UPDATE "project" SET "status" = 2 WHERE "status" IN (3, 4);
