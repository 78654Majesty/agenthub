# AgentHub - Claude Code 开发规则

> AI Agent 链上市场平台。ERC-8004 身份 + x402 支付 + IPFS 元数据。

## 项目结构

```
hfpay-agenthub-web/           ← 仓库根目录（不是 monorepo root）
├── agenthub-gateway/          ← 子目录 1：后端 API + Web 前端 + 共享包（pnpm workspace）
├── agenthub-plugin/           ← 子目录 2：Claude Code MCP Plugin（独立项目）
└── docs/                      ← 设计文档
```

两个子目录是**独立项目**，各自有 package.json。gateway 是 pnpm workspace，plugin 是独立 npm 项目。

## 技术栈

| 层 | 技术 |
|----|------|
| Gateway API | Fastify + TypeScript |
| ORM | Prisma + SQLite (WAL mode) |
| Web | Next.js 14 (App Router) + Tailwind |
| Plugin | @modelcontextprotocol/sdk (stdio) |
| 链上身份/声誉 | `8004-solana` SDK (ERC-8004 on Solana) |
| 链上支付 | `@x402/fetch` + `@x402/svm` (USDC) |
| 离链元数据 | IPFS (Pinata) |

## 团队分工

| 角色 | 负责范围 |
|------|---------|
| **你（项目负责人）** | Prisma Schema、基建代码（packages/、middleware/、chain/、workers/、layout）、Docker、代码审核 |
| **Dev A** | Marketplace + Provider（路由、服务、Web 页面、组件） |
| **Dev B** | Consumer Web + Admin（路由、服务、Web 页面、组件） |
| **Dev C** | Plugin 全部 + Consumer Gateway API + Auth |

## 全局禁止操作

1. **不要修改 `prisma/schema.prisma`** — 所有 Schema 变更找项目负责人提需求
2. **不要修改 `gateway/src/index.ts`** — 入口文件由 route-loader 自动加载路由
3. **不要跨模块修改** — 只在自己独占的目录下编写代码
4. **不要直接操作链上** — 所有 ERC-8004 / Solana 操作必须通过 `packages/chain/` 封装
5. **不要在共享文件中加模块特定逻辑** — packages/auth、packages/chain 是公共基建

## Git 规范

| 规则 | 说明 |
|------|------|
| 分支命名 | `feat/dev-a-*`、`feat/dev-b-*`、`feat/dev-c-*` |
| commit 前缀 | `feat(dev-a):` / `feat(dev-b):` / `feat(dev-c):` / `feat(infra):` |
| main 保护 | 必须 PR 合入 |
| 独占目录 self-merge | 只改自己目录的 PR 可自行 merge |
| 共享文件 | 碰 schema / auth / chain / layout 的 PR 需项目负责人批准 |
| 每日 rebase main | 保持同步 |

## Schema 管理

Prisma Schema 由项目负责人统一管理。需要新增字段或模型时：

1. 在 PR 描述中列出需求（表名、字段名、类型、默认值）
2. 项目负责人修改 schema 并合入 main
3. 各分支 rebase 获取最新 schema

## 环境变量

见 `.env.example`。关键变量：
- `PLATFORM_WALLET_SECRET_KEY` — 平台钱包私钥（Agent 注册 + Feedback 提交用）
- `PINATA_JWT` — IPFS 上传用
- `AGENTHUB_COLLECTION_POINTER` — ERC-8004 Agent Collection 标识
- `JWT_SECRET` — Token 签发用
