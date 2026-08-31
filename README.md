# 契通 Compact —— 项目合同管理系统

面向中小型企业的轻量级项目合同管理系统,实现**项目全生命周期管理、合同全流程跟踪、财务收支一体化管理**。

- 产品名称:契通项目合同管理系统(契通 Compact)
- 英文:Compact — Contract & Project Intelligence Platform
- 当前进度:**第一轮核心模块已全部完成并验证**(详见下方「功能模块」);第二轮待办:报表中心 + 系统管理

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16(App Router,React 19 + TypeScript) |
| UI | shadcn/ui(Base UI 版本)+ Tailwind CSS 4 + lucide-react |
| 表单/校验 | react-hook-form + zod |
| ORM / 数据库 | Prisma 7(@prisma/adapter-pg)+ PostgreSQL |
| 认证 | JWT(jose)+ httpOnly cookie |
| 文件存储 | 服务器本地磁盘(`UPLOAD_DIR`),按年分目录 |
| 构建工具 | pnpm + Turbopack |

前后端合一(页面 + API Routes 在同一项目内),详见 [`docs/技术栈清单_自建服务器版.md`](docs/技术栈清单_自建服务器版.md)。

## 功能模块(第一轮已完成)

| 模块 | 说明 |
|---|---|
| 认证登录 | 登录/登出,JWT httpOnly cookie;密码连续错 5 次锁定账号 15 分钟;重置密码后强制下次登录修改 |
| 首页 Dashboard | 9 项统计卡片:项目数量、合同数量、合同总金额、销售/采购总金额、开票/收票总金额、留底税额、已交纳税额;按公司主体实时过滤 |
| 公司管理 | 公司档案增删改、停用/启用、地址/电话;点击名称弹详情;被合同引用后不可停用 |
| 用户管理 | 用户 CRUD、角色分配(超级管理员/管理员/财务/普通成员)、重置密码、停用/启用 |
| 项目管理 | 立项/结项两态;详情页聚合「销售合同金额 / 采购合同金额 / 已开票 / 已收票」四项汇总 |
| 合同管理 | 合同录入/编辑、**金额调整**(新金额不能低于已发生资金/发票合计)、合同类型(销售/采购);**验收单据**(验收日期 + 验收单文件)、**合同原件**(多文件上传/下载);**删除合同级联清理**其下全部资金/发票/验收单据/附件/合同原件;无「状态」概念、无变更履历 |
| 资金记录 | 收款/付款方向由合同类型自动推导;登记即计入进度(无待确认状态),可上传凭证图片,登记错误可直接删除 |
| 发票记录 | 销项/进项由合同类型自动推导;支持发票文件上传;**可直接删除单张发票**;无状态字段(登记即计入进度)、无核销、无认证抵扣、无红冲 |
| 公司主体过滤 | 顶栏公司选择器,**全系统数据按公司过滤**;超管可切「全部公司」或任一家,公司账号锁定本公司 |

### 权限模型

| 角色 | 说明 |
|---|---|
| 超级管理员 | 全部模块可操作,可切换任意公司主体 |
| 管理员 | 公司/用户/项目/合同可操作;财务数据查看 |
| 财务 | 资金/发票(及验收单据)登记与确认可操作 |
| 普通成员 | 只读 + 仅可操作自己创建的合同 |

## 快速开始

### 环境要求

- Node.js ≥ 22(开发验证于 v26)
- PostgreSQL ≥ 14
- pnpm ≥ 11

### 步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量(.env)
cp .env.example .env
# DATABASE_URL=postgresql://user:pass@localhost:5432/compact
# JWT_SECRET=<随机长字符串>
# UPLOAD_DIR=<附件存储目录,默认 ./uploads>

# 3. 生成 Prisma 客户端 + 初始化数据库(建表 + 种子数据)
pnpm prisma generate
pnpm prisma migrate deploy
pnpm prisma db seed

# 4. 启动开发服务器
pnpm dev
```

打开 http://localhost:3000 即可访问。

### Docker 部署(生产)

仓库内置 Docker 化部署方案(app + PostgreSQL 16),上传文件通过 bind mount 保存在宿主本地磁盘:

```bash
# 1. 进入 deploy 目录并配置环境变量
cd deploy
cp .env.example .env
#   修改 .env:JWT_SECRET(openssl rand -hex 32)、DB_PASSWORD、APP_PORT(对外端口)、UPLOAD_HOST_DIR(宿主上传目录)
#   可选:COOKIE_SECURE=true —— 仅当对外已接入 HTTPS 时设置(纯 http 部署保持默认关闭,否则浏览器拒绝 Secure cookie 导致登录态丢失)

# 2. 构建并启动(启动时自动执行数据库迁移)
docker compose up -d --build

# 3. 初始化平台超管 admin(幂等,仅首次执行)
docker compose exec app node_modules/.bin/tsx prisma/seed-bootstrap.ts

# 4. 查看日志 / 停止
docker compose logs -f app
docker compose down
```

- 首次启动会自动执行 `prisma migrate deploy`;`seed-bootstrap.ts` 仅创建超管 `admin / admin123`(正式使用请登录后尽快修改密码),不写入演示数据。
- 上传文件保存在宿主的 `UPLOAD_HOST_DIR`(默认 `./uploads`),容器重建不丢失。
- 国内服务器构建默认走 npmmirror(`Dockerfile` 内 `NPM_REGISTRY` ARG 可覆盖),`pnpm` 已配置长超时与低并发以适配海外/国内镜像波动。

### 演示账号(密码均为 `admin123`)

| 账号 | 角色 | 公司主体 |
|---|---|---|
| `admin` | 超级管理员 | 无(可切换全部/任一公司) |
| `manager1` | 管理员 | 示例科技有限公司 |
| `finance1` | 财务 | 示例科技有限公司 |
| `member1` | 普通成员 | 华为技术有限公司(行级权限,仅见自己创建的合同) |

## 目录结构

```
prisma/
  schema.prisma        数据模型
  migrations/          Prisma 迁移
  seed.ts              种子数据(演示账号/公司/项目/合同/资金/发票/字典)
src/
  app/api/             API Routes(认证/公司/用户/项目/合同/资金/发票/验收单据/上传/文件/字典/仪表盘)
  app/(main)/          RSC 服务端容器 + 客户端数据组件(dashboard/companies/projects/contracts/users/profile)
  app/(auth)/login     登录页
  components/          shadcn/ui 组件 + 布局(topbar 含公司选择器)
  lib/                 auth/session/authorize/company-context/upload/oplog/db 等
  hooks/               use-dicts 等
  generated/prisma     Prisma 生成客户端(勿手改)
  types/               共享类型
uploads/               上传文件(按年分目录)
```

## 开发约定

- 本仓库使用 **Next.js 16 / Prisma 7 / shadcn/ui(Base UI 版本)**,部分 API 与惯例与旧版 Next.js 不同,写代码前先读 `node_modules/next/dist/docs/` 对应指南,并参考 `AGENTS.md`。
- 金额统一 `Decimal(18,2)`,前端用 `toNumber()` / `formatMoney()` 处理。
- 核心业务表软删除(`is_deleted` + `deleted_at`)+ `version` 乐观锁;附件/验收单据硬删。
- 业务编号走 `sys_sequence` 原子自增:`XM-`(项目)/`HT-`(合同)/`RF-`(发票)前缀 + 年份 + 序号。
- **修改 `prisma/schema.prisma` 后**:`pnpm prisma migrate dev --name xxx` 生成迁移 → 手动核对 migration.sql → `pnpm prisma migrate deploy` → 重启 dev server 加载新 Prisma client。
- 字典类枚举(合同类型/项目状态等)走 `sys_dict` 表,`/api/dict/list` 接口下发,前端不写死。

## 验证

```bash
pnpm exec tsc --noEmit   # 类型检查
pnpm build               # 生产构建
```

## 第二轮待办(未实现,schema 已预留)

- **报表中心**:合同汇总 / 收付款汇总 / 客户排行,Excel / PDF 导出
- **系统管理**:数据字典维护页、操作日志查询、系统参数配置

完整设计方案与实施差异见 [`docs/项目管理系统完整设计方案_优化版.md`](docs/项目管理系统完整设计方案_优化版.md)。
