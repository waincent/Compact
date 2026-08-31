# 契通 Compact — Docker 生产镜像(多阶段构建)
# 依赖 → 构建 → 运行。运行期使用 `next start`(非 standalone,Prisma 更稳)。
# 默认走 npmmirror(实测本服务器对华为镜像持续下载会 ECONNRESET,npmmirror 更稳);
# 其他环境可 --build-arg NPM_REGISTRY=https://registry.npmjs.org 覆盖。

# ---------- 阶段 1:安装依赖 ----------
FROM node:22-slim AS deps
WORKDIR /app
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN corepack enable && corepack prepare pnpm@11.23.0 --activate \
    && pnpm config set registry "$NPM_REGISTRY" \
    && pnpm config set store-dir /pnpm/store \
    && pnpm config set fetch-timeout 600000 \
    && pnpm config set fetch-retries 5 \
    && pnpm config set fetch-retry-mintimeout 20000 \
    && pnpm config set network-concurrency 4
# pnpm-workspace.yaml 携带 allowBuilds 允许列表(pnpm 11 忽略 package.json 的
# onlyBuiltDependencies),@prisma/engines / esbuild / prisma 的构建脚本必须允许运行,
# 否则 esbuild 二进制不落地,后续 next build 必挂。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# --mount=type=cache 让 pnpm store 跨构建持久化,失败重试不重下
RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile

# ---------- 阶段 2:构建 ----------
FROM node:22-slim AS builder
WORKDIR /app
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
# prisma.config.ts 的 env('DATABASE_URL') 在生成 client 时需要存在,用占位值,运行期由 compose 覆盖
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/compact"
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN corepack enable && corepack prepare pnpm@11.23.0 --activate \
    && pnpm config set registry "$NPM_REGISTRY"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 生成 Prisma client(必须先于 next build)
RUN pnpm prisma generate
# 生产构建
RUN pnpm build

# ---------- 阶段 3:运行 ----------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/uploads
# tini 用于信号转发;curl 供健康检查
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl tini curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/uploads
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY docker-entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint
EXPOSE 3000
ENTRYPOINT ["tini", "--", "/usr/local/bin/entrypoint"]
