#!/bin/sh
# Compact 容器启动入口(runtime 镜像不含 pnpm,直接调用 node_modules 本地二进制):
# 1) 先执行数据库迁移(幂等,不清理数据)
# 2) 再启动 Next.js 生产服务
set -e

echo "==> [$(date '+%F %T')] 执行数据库迁移 (prisma migrate deploy) ..."
node_modules/.bin/prisma migrate deploy

echo "==> [$(date '+%F %T')] 启动 Compact (next start, PORT=${PORT}) ..."
exec node_modules/.bin/next start
