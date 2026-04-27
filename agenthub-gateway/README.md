# AgentHub Gateway

> AI Agent 链上市场平台 — pnpm monorepo: Gateway API (Fastify) + Web (Next.js)

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm 9.15.4
- Docker & Docker Compose (可选)

### 一键启动（推荐）

```bash
pnpm start:dev            # 使用 .env.dev：安装 → 建表 → Seed → 启动
pnpm start:local          # 使用 .env.local：同上，用个人 API Key
```

脚本会自动处理：环境变量 → 依赖安装 → Prisma Client → 建表 → Seed（已有数据则跳过）→ 启动。

### 分步操作

```bash
pnpm setup                # 只做初始化，不启动（默认用 .env.dev）
pnpm setup:local          # 只做初始化，用 .env.local
pnpm dev                  # 启动 Gateway(8080) + Web(3000)
pnpm dev:gateway          # 只启动 Gateway
pnpm dev:web              # 只启动 Web
```

### Docker 一键启动

```bash
cp .env.dev .env                    # Dev 环境
docker compose up --build           # 构建并启动
docker compose up -d                # 后台运行
docker compose down                 # 停止
```

### 验证

```bash
curl http://localhost:8080/health   # → {"status":"ok"}
open http://localhost:3000          # Web 前端
```

## 环境变量

| 文件 | 用途 | Git 跟踪 |
|------|------|----------|
| `.env.dev` | Docker Dev 环境模板 | 是 |
| `.env.prod` | 生产环境模板（值留空） | 是 |
| `.env.local` | 本地 `pnpm dev`（个人 Key） | 否 |
| `.env` | 当前活跃配置，由模板复制 | 否 |

生产部署：`cp .env.prod .env` → 填入密钥 → `docker compose up -d --build`

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm start:dev` | 一键初始化 + 启动（Dev 环境） |
| `pnpm start:local` | 一键初始化 + 启动（本地环境） |
| `pnpm setup` | 只初始化不启动 |
| `pnpm dev` | 启动 Gateway + Web |
| `pnpm build` | 构建全部 |
| `pnpm build:gateway` | 只构建 Gateway |
| `pnpm build:web` | 只构建 Web |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:push` | 同步表结构到数据库 |
| `pnpm db:seed` | 写入种子数据 |
| `pnpm db:reset` | 清空数据库并重新 Seed |
| `pnpm typecheck` | 类型检查 |
| `pnpm lint` | Lint 检查 |

## 查看数据库

数据库文件位于 `prisma/data/agenthub.db`（SQLite + WAL 模式）。

### 方式一：Prisma Studio（可视化，推荐）

```bash
npx prisma studio
```

浏览器自动打开 `http://localhost:5555`，可浏览和编辑所有表数据。

### 方式二：sqlite3 命令行

```bash
sqlite3 prisma/data/agenthub.db
```

```sql
.tables                        -- 列出所有表
.schema Agent                  -- 查看表结构
SELECT * FROM Agent LIMIT 10;  -- 查询数据
.quit                          -- 退出
```

### 方式三：VS Code 插件

安装 `SQLite Viewer` 或 `SQLite Explorer` 插件，在编辑器中直接点击 `.db` 文件查看。

## 项目结构

```
agenthub-gateway/
├── apps/
│   ├── gateway/          # Fastify API (port 8080)
│   └── web/              # Next.js 前端 (port 3000)
├── packages/
│   ├── types/            # 共享类型定义
│   ├── auth/             # 认证库
│   └── chain/            # ERC-8004 + IPFS 链上操作
├── prisma/
│   ├── schema.prisma     # 数据模型 (SQLite + WAL)
│   └── seed.ts           # 种子数据
├── docker-compose.yml
├── Dockerfile.gateway
├── Dockerfile.web
└── docker-entrypoint.sh  # DB 初始化 + 启动
```

## 技术栈

| 层 | 技术 |
|----|------|
| Gateway API | Fastify 5 + TypeScript |
| ORM | Prisma + SQLite (WAL) |
| Web | Next.js 15 (App Router) + Tailwind |
| 链上身份 | ERC-8004 on Solana (`8004-solana`) |
| 链上支付 | x402 (USDC) |
| 元数据存储 | IPFS (Pinata) |
