# AgentHub 技术规格文档 v1

> 版本：2026-04-19 v1.1
> 目标：Solana 黑客松 MVP，CLI + Web 双入口，x402 原生协议实现 A2A 按能力付费，ERC-8004 标准实现链上 Agent 身份与声誉
> 核心叙事：**AI Agent 是链上可验证的服务提供者（ERC-8004 身份 + IPFS 元数据），Consumer 通过 x402 直接付费调用，Feedback 上链形成声誉飞轮。**

---

## 0. 一句话定义

```
AgentHub = Claude Code Plugin（CLI 消费入口）
         + Gateway（控制平面：发现 / 匹配 / 记录 / 链上锚定）
         + Web（统一应用：Marketplace + Consumer Dashboard + Provider 管理 + Admin 管理）
         + ERC-8004 on Solana（链上 Agent 身份 + 声誉 + IPFS 元数据）
```

用户在 CLI 描述任务 → Gateway 匹配链上注册的 Agent（ERC-8004 Identity） → Plugin 通过 x402 直接付费调用 Agent → Plugin 上报 Receipt 给 Gateway → Feedback 上链（ERC-8004 Reputation） → 声誉累积。
用户在 Web 端查看使用报表 → 管理钱包 → 浏览 Marketplace → 查看链上 Agent 身份与声誉 → 验证 IPFS 元数据。

---

## 1. 与原文档的关键差异

| 维度 | 原文档 | 本 Spec |
|------|--------|---------|
| 项目名 / 命令前缀 | `agentlayer` / `al-` | `agentHub` / `ah:` |
| x402 实现 | 自建 HTTP 402 握手 + Gateway 代收款 | **使用 Coinbase x402 原生协议**（`@x402/fetch` + `@x402/svm`），Agent 即 x402 服务端 |
| 支付路径 | Consumer → Gateway → Provider | **Consumer → Agent 直接付费**，Gateway 事后验证记录 |
| 角色模型 | Wallet 表 `role` 单值 | **无 role 字段**，靠 Agent/Order 关联推断身份 |
| Provider 上链 | Provider 自主双签上链 | **Provider 提交 → Admin 审批 → 平台上链** |
| Web 架构 | 4 个独立 Next.js 应用 | **1 个统一 Next.js 应用**，按 URL 路由区分角色 |
| 认证方式 | 全部钱包签名 | Admin 账号密码登录，非 Admin 钱包签名 |
| CLI→Web 跳转 | 无 | `ah:dashboard` 带 token 免登录跳转 |
| 仓库结构 | 单个 monorepo | **一个仓库两个子目录**：gateway + plugin |
| 团队分工 | 5 人固定分工 | **3 人开发**，你统一管理 Schema/基建 |
| 数据库 | SQLite + Prisma | 不变 |
| Agent 执行 | Mock Adapter / HTTP 调用 | **x402 原生 Agent**，Provider 自建 x402 服务端 |
| 链上标准 | 自定义 Solana Anchor 合约（3 个 Program） | **ERC-8004 标准**（`8004-solana` SDK），无需写 Rust 合约 |
| 链上元数据 | 链上存 `metadata_hash` | **IPFS 完整 JSON**（ERC-8004 Registration File）+ 链上 URI 指针 |
| 声誉系统 | 自建 `reputation-registry` Program（sum/count） | **ERC-8004 Reputation Registry**，标准化 Feedback + Tag 分类 |

---

## 2. 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| Plugin MCP Server | TypeScript + `@modelcontextprotocol/sdk` | CLI 消费入口，stdio 模式 |
| Plugin x402 Client | `@x402/fetch` + `@solana/web3.js` | 直接付费调用 Agent |
| Plugin Wallet Bridge SDK | TypeScript in-process SDK | 本地 keypair 管理、签名、x402 SVM signer |
| Gateway API | Fastify + TypeScript | 控制平面 REST API |
| Gateway ORM | Prisma + SQLite | 轻量级，无需独立数据库服务 |
| Web 前端 | Next.js 14 + TypeScript（App Router） | 统一应用，按路由区分角色 |
| 链上身份/声誉 | `8004-solana` SDK（ERC-8004 on Solana） | Agent 注册为 Core NFT + IPFS 元数据 + Feedback 声誉 |
| 离链元数据 | IPFS（Pinata） | Agent Registration File + Feedback Detail JSON |
| x402 协议 | `@x402/core` + `@x402/svm` + `@x402/fetch` | Coinbase 开源标准 |
| 支付代币 | USDC on Solana Devnet | x402 标准支付方式 |
| 钱包（CLI） | 本地 keypair，后续补 AES-256-GCM 加密 | Wallet Bridge SDK 管理 |
| 钱包（Web） | 浏览器 keypair，WebCrypto 加密存 localStorage | 或导入 CLI keypair 统一身份 |
| 匹配 rerank | Claude API（claude-sonnet） | 语义排序，无需向量数据库 |
| 容器化 | Docker Compose | Gateway + Web 一键部署 |

---

## 3. 系统整体架构

```
                     ┌─────────────────────────────────────────────┐
                     │              Solana Devnet                   │
                     │  ┌────────────────┐  ┌───────────────────┐  │
                     │  │ ERC-8004       │  │ x402 交易         │  │
                     │  │ Identity       │  │ (USDC Transfer)   │  │
                     │  │ (Core NFT)     │  └───────────────────┘  │
                     │  ├────────────────┤                         │
                     │  │ ERC-8004       │  ┌───────────────────┐  │
                     │  │ Reputation     │  │ IPFS (Pinata)     │  │
                     │  │ (Feedback)     │  │ Agent Metadata    │  │
                     │  └────────────────┘  │ Feedback Detail   │  │
                     │                      └───────────────────┘  │
                     └──────┬────────────────────┬─────────────────┘
                            │                    │
                 ┌──────────┼────────────────────┼─────────────────┐
                 │              Gateway (Fastify)                    │
                 │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
                 │  │ Auth     │ │ Match    │ │ Receipt/Feedback │ │
                 │  │ 层       │ │ 引擎     │ │ 记录 + ERC-8004  │ │
                 │  └──────────┘ └──────────┘ └──────────────────┘ │
                 │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
                 │  │Provider  │ │Market    │ │ Admin            │ │
                 │  │服务      │ │服务      │ │ 服务             │ │
                 │  └──────────┘ └──────────┘ └──────────────────┘ │
                 └──────┬───────────┬──────────────┬───────────────┘
                        │           │              │
          ┌─────────────┤           │              │
          │             │           │              │
   ┌──────▼──────┐ ┌────▼───────┐  │         ┌────▼──────┐
   │ Plugin      │ │ Web        │  │         │ x402      │
   │ (CLI 入口)  │ │ (Next.js)  │  │         │ Agent     │
   │             │ │            │  │         │ (Provider │
   │ MCP Server  │ │ Marketplace│  │         │  自建)    │
   │ Wallet      │ │ Consumer   │  │         │           │
   │ Bridge      │ │ Provider   │  │         └───────────┘
   │ x402 Client │ │ Admin      │  │               ▲
   └──────┬──────┘ └────────────┘  │               │
          │                        │               │
          │    x402 直接付费调用    │               │
          └────────────────────────┘───────────────┘
```

### 3.1 核心流程：ah:run（CLI 执行任务）

```
1. Plugin → Gateway: POST /v1/public/match {task}
   Gateway 做 DB 规则过滤 + Claude API rerank
   返回 top Agent（含 endpoint URL、价格、评分）

2. Plugin → 用户: 展示匹配结果，等待确认 y/n

3. Plugin → Agent endpoint: x402Fetch(endpoint, {task})
   内部流程：
   a. GET endpoint → Agent 返回 402 {price, payTo, token}
   b. Plugin 本地签名 USDC 转账 tx（未广播）
   c. 带 X-PAYMENT header 重发请求
   d. Agent server 验证 tx → 广播上链 → 确认 → 执行任务
   e. Agent 返回 200 + result + PAYMENT-RESPONSE header

4. Plugin 从 PAYMENT-RESPONSE 解码出：
   - transaction: "5abc..."  ← 已上链的 tx signature
   - payer: consumer 钱包地址
   - amount: 实际支付金额
   - network: "solana:devnet"

5. Plugin → Gateway: POST /v1/consumer/receipts
   {agent_id, task_text, tx_signature, payer, amount, result_hash}
   Gateway 调 getTransaction(tx_signature) 链上验证
   验证通过 → 记录 receipt → 异步 Worker 调 8004-solana SDK 提交 Feedback 上链

6. Plugin → 用户: 展示结果 + Receipt ID + Explorer 链接

7. 可选评分 → Gateway: POST /v1/consumer/ratings
```

### 3.2 核心流程：Provider 提交 Agent

```
1. Provider 在 Web 端填写 Agent 信息（名称、描述、标签、定价、x402 endpoint URL、skills、domains）
2. Web → Gateway: POST /v1/provider/agents → status: "pending_review"
3. Admin 在 Web 端看到审核列表
4. Admin 可选择测试调用 Agent endpoint 验证可用性
5. Admin 审批通过 → Gateway 执行 ERC-8004 上链流程：
   a. 构建 ERC-8004 Registration File JSON（标准格式）
   b. 上传 IPFS (Pinata) → 获得 metadataUri (ipfs://Qm...)
   c. 调 8004-solana SDK: sdk.registerAgent(metadataUri, { collectionPointer })
   d. 返回 asset: PublicKey（Core NFT 地址）
   e. 更新 DB: sol_asset_address + ipfs_cid + chain_status: "registered"
6. status: "active" → Agent 出现在 Marketplace，链上可查
```

### 3.3 核心流程：ah:dashboard 免登录跳转

```
1. 用户在 CLI 执行 ah:dashboard
2. Plugin 用当前 JWT 生成一个短时效 token（或直接用 JWT）
3. 拼接 URL: https://web.agenthub.com/dashboard?token=xxx
4. 打开本地浏览器跳转
5. Web 端从 URL 解析 token → 验证 → 写入 cookie/localStorage → 进入 Dashboard
```

---

## 4. 仓库结构

```
hfpay-agenthub-web/                       ← 仓库根目录
│
├── agenthub-gateway/                      ← 子目录 1：后端 + Web + 合约
│   ├── apps/
│   │   ├── gateway/                       ← Fastify API 后端
│   │   │   ├── package.json
│   │   │   └── src/
│   │   │       ├── index.ts               ← 入口（自动路由加载，不手动改）
│   │   │       ├── config.ts              ← 环境变量管理
│   │   │       │
│   │   │       ├── lib/
│   │   │       │   ├── route-loader.ts    ← 自动扫描 routes/*/index.ts
│   │   │       │   ├── prisma.ts          ← Prisma client 单例
│   │   │       │   └── errors/            ← 按模块拆分的错误码
│   │   │       │       ├── index.ts       ← 合并导出
│   │   │       │       ├── auth.ts
│   │   │       │       ├── market.ts
│   │   │       │       ├── consumer.ts
│   │   │       │       ├── provider.ts
│   │   │       │       └── admin.ts
│   │   │       │
│   │   │       ├── middleware/
│   │   │       │   ├── verify-wallet-jwt.ts
│   │   │       │   ├── verify-admin-session.ts
│   │   │       │   └── mock-auth.ts       ← 开发用
│   │   │       │
│   │   │       ├── routes/                ← 每人独占自己的目录
│   │   │       │   ├── public-auth/       ← Dev C 独占
│   │   │       │   │   └── index.ts
│   │   │       │   ├── public-market/     ← Dev A 独占
│   │   │       │   │   └── index.ts
│   │   │       │   ├── consumer/          ← Dev C 独占
│   │   │       │   │   └── index.ts
│   │   │       │   ├── provider/          ← Dev A 独占
│   │   │       │   │   └── index.ts
│   │   │       │   └── admin/             ← Dev B 独占
│   │   │       │       └── index.ts
│   │   │       │
│   │   │       ├── services/
│   │   │       │   ├── auth.service.ts    ← Dev C 独占
│   │   │       │   ├── match.service.ts   ← Dev C 独占
│   │   │       │   ├── market/            ← Dev A 独占
│   │   │       │   ├── consumer/          ← Dev C 独占
│   │   │       │   ├── provider/          ← Dev A 独占
│   │   │       │   └── admin/             ← Dev B 独占
│   │   │       │
│   │   │       ├── chain/                 ← 公共链上通信层（ERC-8004 + x402）
│   │   │       │   ├── erc8004.ts         ← 8004-solana SDK 初始化 + 封装
│   │   │       │   ├── ipfs.ts            ← Pinata IPFS 上传/读取
│   │   │       │   └── tx-verify.ts       ← x402 交易链上验证（getTransaction）
│   │   │       │
│   │   │       └── workers/
│   │   │           └── feedback.worker.ts ← 统一 Feedback 上链（替代原 receipt + reputation 两个 worker）
│   │   │
│   │   └── web/                           ← Next.js 统一前端应用
│   │       ├── package.json
│   │       └── src/
│   │           ├── app/
│   │           │   ├── layout.tsx          ← 全局布局（你写）
│   │           │   ├── page.tsx            ← 首页 Landing（你写）
│   │           │   │
│   │           │   ├── login/             ← Dev B 独占
│   │           │   │   └── page.tsx        ← 钱包登录
│   │           │   │
│   │           │   ├── marketplace/       ← Dev A 独占
│   │           │   │   ├── page.tsx        ← Agent 列表
│   │           │   │   └── [id]/
│   │           │   │       └── page.tsx    ← Agent 详情
│   │           │   │
│   │           │   ├── dashboard/         ← Dev B 独占（Consumer）
│   │           │   │   └── page.tsx
│   │           │   ├── orders/            ← Dev B 独占
│   │           │   │   ├── page.tsx
│   │           │   │   └── [id]/page.tsx
│   │           │   ├── receipts/          ← Dev B 独占
│   │           │   │   ├── page.tsx
│   │           │   │   └── [id]/page.tsx
│   │           │   ├── wallet/            ← Dev B 独占
│   │           │   │   └── page.tsx
│   │           │   │
│   │           │   ├── provider/          ← Dev A 独占
│   │           │   │   ├── dashboard/
│   │           │   │   ├── agents/
│   │           │   │   │   ├── page.tsx
│   │           │   │   │   ├── new/page.tsx
│   │           │   │   │   └── [id]/page.tsx
│   │           │   │   ├── orders/
│   │           │   │   └── ratings/
│   │           │   │
│   │           │   └── admin/             ← Dev B 独占
│   │           │       ├── login/page.tsx  ← 账号密码登录
│   │           │       ├── dashboard/
│   │           │       ├── agents/        ← 审批列表
│   │           │       ├── receipts/      ← 失败补跑
│   │           │       └── users/
│   │           │
│   │           ├── lib/
│   │           │   ├── wallet.ts          ← 浏览器端钱包管理（你写）
│   │           │   ├── auth.ts            ← 认证状态管理（你写）
│   │           │   └── api/               ← 按模块拆分 API client
│   │           │       ├── market.ts      ← Dev A
│   │           │       ├── provider.ts    ← Dev A
│   │           │       ├── consumer.ts    ← Dev B
│   │           │       └── admin.ts       ← Dev B
│   │           │
│   │           └── components/
│   │               ├── layout/            ← 全局导航组件（你写）
│   │               ├── marketplace/       ← Dev A
│   │               ├── provider/          ← Dev A
│   │               ├── consumer/          ← Dev B
│   │               └── admin/             ← Dev B
│   │
│   ├── packages/
│   │   ├── types/                         ← 共享 API 类型定义
│   │   │   └── src/
│   │   │       ├── index.ts               ← re-export（你管理）
│   │   │       ├── common.ts              ← 基础类型（你写）
│   │   │       ├── market.ts              ← Dev A
│   │   │       ├── consumer.ts            ← Dev C
│   │   │       ├── provider.ts            ← Dev A
│   │   │       └── admin.ts               ← Dev B
│   │   │
│   │   ├── auth/                          ← 公共认证库（你先写第一版）
│   │   │   └── src/
│   │   │       ├── challenge.ts
│   │   │       ├── jwt.ts
│   │   │       ├── wallet-sign.ts
│   │   │       └── admin-auth.ts
│   │   │
│   │   └── chain/                         ← 公共链上操作库（你先写第一版）
│   │       └── src/
│   │           ├── erc8004-sdk.ts         ← 8004-solana SDK 初始化 + 导出
│   │           ├── ipfs-client.ts         ← Pinata IPFS 封装
│   │           ├── agent-register.ts      ← Agent 注册（buildRegistrationFile + registerAgent）
│   │           ├── feedback.ts            ← Feedback 提交（giveFeedback + getSummary）
│   │           ├── agent-query.ts         ← 链上 Agent 查询（loadAgent + 8004scan）
│   │           ├── tx-verify.ts           ← x402 交易验证（getTransaction）
│   │           └── types.ts               ← ERC-8004 相关类型定义
│   │
│   ├── prisma/
│   │   ├── schema.prisma                  ← 你统一管理
│   │   └── seed.ts                        ← 你统一管理
│   │
│   ├── docker-compose.yml                 ← 你统一管理
│   ├── Dockerfile.gateway
│   ├── Dockerfile.web
│   ├── package.json                       ← pnpm workspace
│   ├── pnpm-workspace.yaml
│   └── .env.example
│
└── agenthub-plugin/                       ← 子目录 2：Claude Code Plugin
    ├── package.json
    └── src/
        ├── index.ts                       ← MCP Server stdio 入口
        ├── tools.ts                       ← MCP tools 定义
        ├── gateway-client.ts              ← Gateway REST 调用
        ├── x402-client.ts                 ← @x402/fetch 封装
        ├── wallet-bridge/
        │   ├── index.ts                   ← SDK 统一导出入口
        │   ├── sdk.ts                     ← connect/status/sign/x402 signer
        │   └── wallet.ts                  ← keypair 管理
        └── skills/
            ├── connect.md
            ├── run.md
            ├── market.md
            ├── dashboard.md
            ├── receipt.md
            └── help.md
```

---

## 5. 数据模型

### 5.1 核心设计原则

- **无 role 字段**：同一钱包通过 Agent 表关联判断为 Provider，通过 Order/Receipt 关联判断为 Consumer
- **Schema 你统一管理**，开发者改 schema 需找你提需求
- SQLite + WAL mode，开发环境各人独立 .db 文件

### 5.2 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ──────────────────────────────────────────
// 钱包身份（Consumer 和 Provider 共用）
// 无 role 字段：有 Agent 记录 = Provider，有 Order 记录 = Consumer
// ──────────────────────────────────────────
model Wallet {
  id          String   @id @default(cuid())
  pubkey      String   @unique
  source      String   @default("cli") // "cli" | "web"（创建来源，仅统计用）
  createdAt   DateTime @default(now())
  lastLoginAt DateTime?

  // 作为 Provider 时的关联
  agents      Agent[]

  // 作为 Consumer 时的关联
  quotes      Quote[]
  orders      Order[]
  receipts    Receipt[]
  ratings     Rating[]

  @@map("wallets")
}

// ──────────────────────────────────────────
// Auth Challenge（替代 Redis）
// ──────────────────────────────────────────
model AuthChallenge {
  id        String   @id @default(cuid())
  wallet    String
  nonce     String   @unique
  used      Boolean  @default(false)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([wallet])
  @@index([expiresAt])
  @@map("auth_challenges")
}

// ──────────────────────────────────────────
// Admin 账户（独立于钱包体系）
// ──────────────────────────────────────────
model AdminUser {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String   // bcrypt hash
  createdAt    DateTime @default(now())
  lastLoginAt  DateTime?

  @@map("admin_users")
}

// ──────────────────────────────────────────
// Agent 定义
// ──────────────────────────────────────────
model Agent {
  id               String   @id @default(cuid())
  providerWalletId String
  providerWallet   Wallet   @relation(fields: [providerWalletId], references: [id])

  name             String
  description      String
  capabilityTags   String   // JSON array: ["security","solana","audit"]
  skills           String   @default("[]")  // JSON array: ERC-8004 skills taxonomy
  domains          String   @default("[]")  // JSON array: ERC-8004 domains taxonomy
  priceUsdcMicro   Int      // 1 USDC = 1_000_000
  endpointUrl      String   // x402 服务端 URL

  // 可选扩展
  inputSchema      String?  // JSON：描述 Agent 接受的输入格式
  outputFormat     String?  // JSON：描述 Agent 返回格式
  model            String?  // Agent 底层使用的 AI 模型
  imageUrl         String?  // Agent 头像/图标 URL

  // 审批状态（Provider 提交 → Admin 审批 → 上链）
  status           String   @default("pending_review")
  // "pending_review" | "approved" | "rejected" | "active" | "suspended"
  reviewNote       String?  // Admin 审批备注（拒绝原因等）
  reviewedAt       DateTime?

  // ERC-8004 链上信息（Admin 审批通过后由平台上链）
  solAssetAddress  String?  // Core NFT asset PublicKey（ERC-8004 Identity）
  ipfsCid          String?  // IPFS metadata CID
  ipfsUri          String?  // ipfs://Qm... 完整 URI
  solPublishTx     String?  // 注册上链的 tx signature
  chainStatus      String   @default("none")
  // "none" | "uploading" | "registered" | "failed"
  registeredAt     DateTime?  // 链上注册时间

  // 统计（冗余存储，可与链上 ERC-8004 Reputation 数据对比验证）
  ratingAvg        Float    @default(0)
  ratingCount      Int      @default(0)
  totalOrders      Int      @default(0)
  avgResponseTimeMs Int     @default(0)

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  quotes           Quote[]
  orders           Order[]
  ratings          Rating[]
  receipts         Receipt[]

  @@index([status])
  @@index([chainStatus])
  @@index([providerWalletId])
  @@map("agents")
}

// ──────────────────────────────────────────
// 报价
// ──────────────────────────────────────────
model Quote {
  id               String   @id @default(cuid())
  agentId          String
  agent            Agent    @relation(fields: [agentId], references: [id])
  consumerWalletId String
  consumerWallet   Wallet   @relation(fields: [consumerWalletId], references: [id])

  taskText         String
  amountUsdcMicro  Int
  status           String   @default("pending")
  // "pending" | "accepted" | "expired" | "cancelled"

  expiresAt        DateTime
  createdAt        DateTime @default(now())

  order            Order?

  @@index([status])
  @@index([expiresAt])
  @@map("quotes")
}

// ──────────────────────────────────────────
// 订单（记录 x402 交易结果）
// ──────────────────────────────────────────
model Order {
  id               String   @id @default(cuid())
  quoteId          String   @unique
  quote            Quote    @relation(fields: [quoteId], references: [id])
  agentId          String
  agent            Agent    @relation(fields: [agentId], references: [id])
  consumerWalletId String
  consumerWallet   Wallet   @relation(fields: [consumerWalletId], references: [id])

  status           String   @default("pending")
  // "pending" | "completed" | "failed"

  // x402 交易信息（Plugin 上报）
  paymentTx        String?  // Solana tx signature（Agent server 广播上链）
  paymentVerified  Boolean  @default(false)  // Gateway 链上验证通过
  paymentPayer     String?  // 实际付款钱包
  paymentAmount    Int?     // 实际支付金额（USDC micro）
  paymentNetwork   String?  // "solana:devnet"

  // Agent 执行结果
  resultHash       String?  // SHA256(result)，Plugin 上报
  responseTimeMs   Int?
  errorCode        String?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  receipt          Receipt?

  @@index([status])
  @@index([agentId])
  @@index([consumerWalletId])
  @@map("orders")
}

// ──────────────────────────────────────────
// 收据（ERC-8004 Feedback 上链）
// ──────────────────────────────────────────
model Receipt {
  id               String   @id @default(cuid())
  orderId          String   @unique
  order            Order    @relation(fields: [orderId], references: [id])
  agentId          String
  agent            Agent    @relation(fields: [agentId], references: [id])
  consumerWalletId String
  consumerWallet   Wallet   @relation(fields: [consumerWalletId], references: [id])

  receiptHash      String   // SHA256(receipt data)
  amountUsdcMicro  Int

  // ERC-8004 Feedback 上链（替代原 Anchor receipt-registry）
  feedbackStatus   String   @default("pending")
  // "pending" | "submitted" | "failed"
  feedbackTx       String?  // 提交 Feedback 的 Solana tx signature
  feedbackIpfsCid  String?  // Feedback detail JSON 的 IPFS CID
  retryCount       Int      @default(0)
  feedbackAt       DateTime?  // Feedback 上链时间

  createdAt        DateTime @default(now())

  rating           Rating?

  @@index([feedbackStatus])
  @@index([consumerWalletId])
  @@map("receipts")
}

// ──────────────────────────────────────────
// 评分（通过 ERC-8004 Feedback 上链，tag1="starred"）
// ──────────────────────────────────────────
model Rating {
  id               String   @id @default(cuid())
  receiptId        String   @unique
  receipt          Receipt  @relation(fields: [receiptId], references: [id])
  agentId          String
  agent            Agent    @relation(fields: [agentId], references: [id])
  consumerWalletId String
  consumerWallet   Wallet   @relation(fields: [consumerWalletId], references: [id])

  score            Int      // 1-5
  comment          String?

  // ERC-8004 Feedback 上链（tag1="starred", value=score*20 → 百分制）
  feedbackStatus   String   @default("pending")
  // "pending" | "submitted" | "failed"
  feedbackTx       String?
  feedbackIpfsCid  String?
  retryCount       Int      @default(0)

  createdAt        DateTime @default(now())

  @@index([agentId])
  @@index([feedbackStatus])
  @@map("ratings")
}
```

### 5.3 ER 关系图

```
Wallet ──1:N──> Agent      (Provider 身份)
Wallet ──1:N──> Quote      (Consumer 身份)
Wallet ──1:N──> Order      (Consumer 身份)
Wallet ──1:N──> Receipt    (Consumer 身份)
Wallet ──1:N──> Rating     (Consumer 身份)

Agent  ──1:N──> Quote
Agent  ──1:N──> Order
Agent  ──1:N──> Receipt
Agent  ──1:N──> Rating

Quote  ──1:1──> Order
Order  ──1:1──> Receipt
Receipt──1:0..1> Rating

AdminUser 独立，不关联 Wallet
```

### 5.4 身份推断逻辑

```typescript
// Web 端判断当前钱包的身份
async function getUserRoles(walletPubkey: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { pubkey: walletPubkey },
    include: {
      agents: { where: { status: { not: 'rejected' } }, take: 1 },
      orders: { take: 1 },
    },
  });

  return {
    isProvider: wallet.agents.length > 0,
    isConsumer: wallet.orders.length > 0,
  };
}
// 两者都为 true → 导航栏同时显示 Consumer 和 Provider 菜单
```

---

## 6. 认证设计

### 6.1 双轨认证

| 用户类型 | 认证方式 | Token 存储 | 受保护路由 |
|---------|---------|-----------|-----------|
| Consumer / Provider | 钱包签名 → JWT | CLI: 内存 / Web: cookie | `/v1/consumer/*`、`/v1/provider/*` |
| Admin | 账号密码 → Session JWT | cookie（httpOnly） | `/v1/admin/*` |

### 6.2 钱包登录流程（Consumer / Provider 共用）

```
GET  /v1/public/auth/challenge?wallet={pubkey}
POST /v1/public/auth/verify { wallet, signature }
```

**注意：无 role 参数。** Gateway 只验证签名是否正确，颁发 JWT 包含 `wallet_pubkey`。身份由数据关联推断。

```typescript
// JWT Payload
{
  wallet_pubkey: string;
  client?: "cli" | "web";  // 可选，审计用
  iat: number;
  exp: number;
}
```

### 6.3 Admin 登录流程

```
POST /v1/admin/auth/login { username, password }
→ 验证 bcrypt hash
→ 颁发 Admin JWT { admin_id, username, role: "admin" }
```

### 6.4 CLI→Web 免登录跳转

```
ah:dashboard 执行时：
1. Plugin 当前持有的 JWT 即可作为跳转 token
2. 拼接 URL: http://localhost:3000/dashboard?token={jwt}
3. 打开浏览器
4. Web 端 middleware 检测 URL 中的 token 参数
   → 验证 JWT 有效 → 写入 cookie → 重定向到 /dashboard（去掉 URL 中的 token）
```

---

## 7. Gateway API 设计

### 7.1 路由总览

```
/v1/public/                          ← 无需认证
  GET  /auth/challenge               ← 获取签名 challenge
  POST /auth/verify                  ← 验证签名，颁发 JWT
  GET  /market/agents                ← Marketplace Agent 列表
  GET  /market/agents/:id            ← Agent 详情
  GET  /market/agents/:id/on-chain   ← 链上 Agent 身份 + 声誉（ERC-8004）
  GET  /market/agents/:id/feedbacks  ← 链上 Feedback 列表
  GET  /market/stats                 ← Marketplace 统计
  POST /match                        ← 能力匹配

/v1/consumer/                        ← 钱包 JWT 认证
  POST /receipts                     ← 上报 x402 交易 receipt
  GET  /receipts                     ← Receipt 列表
  GET  /receipts/:id                 ← Receipt 详情
  GET  /receipts/:id/on-chain       ← Receipt 对应的链上 Feedback 详情
  POST /ratings                      ← 评分
  GET  /orders                       ← 订单历史
  GET  /dashboard                    ← Consumer 报表数据

/v1/provider/                        ← 钱包 JWT 认证
  POST /agents                       ← 提交 Agent（→ pending_review）
  GET  /agents                       ← 我的 Agent 列表
  GET  /agents/:id                   ← Agent 详情
  PATCH /agents/:id                  ← 编辑 Agent
  GET  /dashboard                    ← Provider 报表数据
  GET  /orders                       ← 被调用历史
  GET  /ratings                      ← 收到的评分

/v1/admin/                           ← Admin Session 认证
  POST /auth/login                   ← 账号密码登录
  GET  /stats                        ← 平台统计
  GET  /agents                       ← 所有 Agent（含 pending_review）
  GET  /agents/:id                   ← Agent 详情
  POST /agents/:id/approve           ← 审批通过（触发上链）
  POST /agents/:id/reject            ← 审批拒绝
  POST /agents/:id/suspend           ← 强制下架
  GET  /receipts/failed              ← 失败 Receipt 列表
  POST /receipts/:id/retry           ← 触发补跑
  GET  /users                        ← 用户列表
```

### 7.2 核心接口协议

#### 7.2.1 Auth

```
GET /v1/public/auth/challenge?wallet={pubkey}
Response 200:
{
  challenge: "agenthub:login:{nonce}:{timestamp}",
  expires_in: 300
}

POST /v1/public/auth/verify
Body: { wallet: string, signature: string }
Response 200:
{
  token: "eyJ...",
  wallet_pubkey: string,
  expires_in: "7d"
}
```

#### 7.2.2 能力匹配

```
POST /v1/public/match
Body:
{
  task: string,
  max_price_usdc?: number,
  tags?: string[]
}
Response 200:
{
  top: {
    id, name, description,
    endpoint_url,              ← x402 Agent 服务地址
    price_usdc_micro, rating_avg, rating_count,
    capability_tags,
    sol_asset_address?,      ← ERC-8004 Core NFT 地址
    ipfs_uri?                ← IPFS 元数据 URI
  },
  alternatives: AgentMatch[],
  reason: string               ← Claude API 推荐理由
}
```

#### 7.2.3 Receipt 上报（Plugin → Gateway）

```
POST /v1/consumer/receipts
Auth: Bearer JWT
Body:
{
  agent_id: string,
  task_text: string,
  tx_signature: string,        ← 来自 PAYMENT-RESPONSE header
  payer: string,               ← Consumer 钱包地址
  amount_usdc_micro: number,   ← 实际支付金额
  network: string,             ← "solana:devnet"
  result_hash: string          ← SHA256(agent result)
}
Response 200:
{
  receipt_id: string,
  order_id: string,
  payment_verified: boolean,
  explorer_link?: string
}

Gateway 内部处理：
1. 调 getTransaction(tx_signature) 验证链上交易存在
2. 验证 from = payer = JWT 持有者的钱包
3. 验证 to = Agent 关联的 Provider 钱包 USDC token account
4. 验证 amount 匹配
5. 创建 Order（status: completed）+ Receipt（feedbackStatus: pending）
6. 异步 Feedback Worker：
   a. 构建 Feedback Detail JSON（含 proofOfPayment: { txHash, fromAddress, toAddress }）
   b. 上传 IPFS → feedbackUri
   c. 调 sdk.giveFeedback(agentAsset, { value: "100", tag1: "transaction", feedbackUri })
   d. 更新 Receipt.feedbackStatus → "submitted"
```

#### 7.2.4 Consumer Dashboard

```
GET /v1/consumer/dashboard
Auth: Bearer JWT
Response 200:
{
  summary: {
    total_orders: number,
    total_spending_usdc: number,
    active_agents_used: number,
    avg_rating_given: number,
    success_rate: number
  },
  spending_trend: [
    { date: string, amount_usdc: number, order_count: number }
  ],
  top_agents: [
    { agent_id, agent_name, order_count, total_spent_usdc, avg_rating }
  ],
  recent_orders: [
    { order_id, agent_name, task_preview, amount_usdc_micro, status, created_at }
  ],
  chain_receipts: {
    total: number,
    confirmed: number,
    pending: number,
    failed: number
  }
}
```

#### 7.2.5 Provider Agent 提交

```
POST /v1/provider/agents
Auth: Bearer JWT
Body:
{
  name: string,
  description: string,
  capability_tags: string[],
  price_usdc_micro: number,
  endpoint_url: string,        ← x402 服务端地址
  input_schema?: object,
  output_format?: object,
  model?: string
}
Response 201:
{
  agent_id: string,
  status: "pending_review",
  metadata_hash: string
}
```

#### 7.2.6 Admin 审批

```
POST /v1/admin/agents/:id/approve
Auth: Admin Session
Body: { note?: string }
Response 200:
{
  agent_id: string,
  status: "active",
  sol_asset_address: string,
  ipfs_uri: string,
  explorer_link: string
}

内部处理（ERC-8004 上链流程）：
1. 构建 ERC-8004 Registration File JSON:
   {
     type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
     name, description, image,
     services: [{ name: "MCP", endpoint: endpointUrl, skills, domains }],
     x402Support: true,
     active: true,
     registrations: [{ agentId, agentRegistry: "solana:devnet:<programId>" }],
     supportedTrust: ["reputation"]
   }
2. 上传 IPFS (Pinata) → metadataUri (ipfs://Qm...)
3. 调 sdk.registerAgent(metadataUri, { collectionPointer: AGENTHUB_COLLECTION })
4. 更新 Agent: status="active", sol_asset_address, ipfs_cid, ipfs_uri, chain_status="registered"

POST /v1/admin/agents/:id/reject
Auth: Admin Session
Body: { note: string }
Response 200:
{
  agent_id: string,
  status: "rejected",
  review_note: string
}
```

---

## 8. Plugin 设计

### 8.1 MCP Tools

```typescript
export const TOOLS = [
  {
    name: "wallet_connect",
    description: "连接或创建本地 Solana 钱包，完成 Gateway Auth",
    inputSchema: { type: "object", properties: {} }
    // 返回: { pubkey, balance_usdc, network, is_new }
  },
  {
    name: "wallet_status",
    description: "查询钱包连接状态和余额",
    inputSchema: { type: "object", properties: {} }
    // 返回: { connected, pubkey?, balance_usdc? }
  },
  {
    name: "wallet_export",
    description: "导出钱包私钥（base58），用于 Web 端导入",
    inputSchema: { type: "object", properties: {} }
    // 返回: { pubkey, secret_key_base58, warning }
  },
  {
    name: "market_list",
    description: "列出 Marketplace 所有可用 Agent",
    inputSchema: {
      type: "object",
      properties: {
        tags: { type: "array", items: { type: "string" } },
        max_price_usdc: { type: "number" },
        sort: { type: "string", enum: ["rating","price_asc","price_desc"] }
      }
    }
  },
  {
    name: "match_capability",
    description: "根据任务描述自动匹配最合适的 Agent",
    inputSchema: {
      type: "object",
      required: ["task"],
      properties: {
        task: { type: "string" },
        max_price_usdc: { type: "number" }
      }
    }
    // 返回: { top: AgentMatch, alternatives, reason }
  },
  {
    name: "run_agent_task",
    description: "x402 付费调用 Agent 并上报 Receipt",
    inputSchema: {
      type: "object",
      required: ["agent_id", "task", "endpoint_url"],
      properties: {
        agent_id: { type: "string" },
        task: { type: "string" },
        endpoint_url: { type: "string" }
      }
    }
    // 内部：x402Fetch → 获取结果 → 上报 Gateway
    // 返回: { result, receipt_id, tx_signature, explorer_link }
  },
  {
    name: "get_receipt",
    description: "查询 Receipt 详情和链上状态",
    inputSchema: {
      type: "object",
      required: ["receipt_id"],
      properties: { receipt_id: { type: "string" } }
    }
  },
  {
    name: "rate_agent",
    description: "对已完成任务评分（1-5）",
    inputSchema: {
      type: "object",
      required: ["receipt_id", "score"],
      properties: {
        receipt_id: { type: "string" },
        score: { type: "integer", minimum: 1, maximum: 5 },
        comment: { type: "string" }
      }
    }
  },
  {
    name: "open_dashboard",
    description: "打开浏览器跳转 Web 端 Dashboard",
    inputSchema: { type: "object", properties: {} }
    // 内部：拼接 URL + token → open 浏览器
  }
];
```

### 8.2 Skill 命令

| 命令 | Skill 文件 | 触发的 MCP Tools |
|------|-----------|-----------------|
| `ah:connect` | connect.md | `wallet_connect` |
| `ah:run <task>` | run.md | `wallet_status` → `match_capability` → 用户确认 → `run_agent_task` → 可选 `rate_agent` |
| `ah:market` | market.md | `market_list` |
| `ah:dashboard` | dashboard.md | `open_dashboard` |
| `ah:receipt [id]` | receipt.md | `get_receipt` |
| `ah:help` | help.md | 无（纯文本输出） |

### 8.3 Wallet Bridge SDK

```
进程内 SDK，由本地 MCP runtime 直接调用

connectWallet()     ← 创建/加载钱包
getStatus()         ← 查询状态
signMessage()       ← 签名 Auth challenge
getSvmSigner()      ← 提供 x402 SVM client signer
```

Claude Code 通过插件内置 `.mcp.json` 启动 MCP Server；MCP Server 不再检测或拉起 `localhost:8090` HTTP 服务。

---

## 9. ERC-8004 链上集成

> **重大变更**：不再使用自定义 Solana Anchor 合约。改用 [ERC-8004 标准](https://eips.ethereum.org/EIPS/eip-8004) 的 Solana 实现（[`8004-solana`](https://github.com/QuantuLabs/8004-solana-ts) SDK），无需编写 Rust 代码、无需部署合约。

### 9.1 ERC-8004 on Solana 概述

| 功能 | ERC-8004 Registry | 实现方式 | 谁调用 |
|------|-------------------|---------|--------|
| Agent 身份 | **Identity Registry** | Core NFT（Solana Metaplex Core 标准） | Admin 审批通过时，平台钱包调 `sdk.registerAgent()` |
| 声誉反馈 | **Reputation Registry** | `FeedbackAccount` PDA + IPFS | Feedback Worker 用平台钱包调 `sdk.giveFeedback()` |
| Agent 元数据 | 离链（IPFS） | Registration File JSON（Pinata） | 随 Identity 注册一同上传 |

**核心优势**：
- **零合约代码**：不写 Rust，不需要 Anchor 工具链，不需要 `contracts/` 目录
- **行业标准**：注册的 Agent 可被 [8004scan.io](https://8004scan.io) 等第三方索引发现
- **标准化元数据**：ERC-8004 Registration File 格式，支持 MCP / A2A / OASF 等多协议
- **纯 TypeScript**：3 人团队无需 Rust 开发能力

### 9.2 SDK 初始化

```typescript
import { SolanaSDK, IPFSClient } from '8004-solana';
import { Keypair } from '@solana/web3.js';

// 平台钱包作为 signer（用于 Agent 注册 + Feedback 提交）
const sdk = new SolanaSDK({
  cluster: 'devnet',
  signer: Keypair.fromSecretKey(Buffer.from(PLATFORM_WALLET_SECRET_KEY, 'base64')),
  ipfsClient: new IPFSClient({
    pinataEnabled: true,
    pinataJwt: PINATA_JWT,
  }),
  rpcUrl: SOLANA_RPC_URL,
});
```

### 9.3 Agent Registration File 格式

Admin 审批通过后，Gateway 构建标准 ERC-8004 JSON 并上传 IPFS：

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "Code Review Agent",
  "description": "AI code review powered by GPT-4, specializes in Solana programs",
  "image": "ipfs://QmAgentImageHash...",
  "services": [
    {
      "name": "MCP",
      "endpoint": "https://agent.example.com/mcp",
      "version": "1.0",
      "skills": ["natural_language_processing/code_review"],
      "domains": ["technology/software_engineering"]
    }
  ],
  "x402Support": true,
  "active": true,
  "registrations": [
    {
      "agentId": 42,
      "agentRegistry": "solana:devnet:<8004_program_id>"
    }
  ],
  "supportedTrust": ["reputation"]
}
```

### 9.4 Agent 注册上链

```typescript
// packages/chain/src/agent-register.ts
import { buildRegistrationFileJson, ServiceType } from '8004-solana';

export async function registerAgentOnChain(agent: AgentRecord) {
  // 1. 构建 Registration File
  const registrationFile = buildRegistrationFileJson({
    name: agent.name,
    description: agent.description,
    image: agent.imageUrl,
    services: [{
      type: ServiceType.MCP,
      value: agent.endpointUrl,
    }],
    skills: JSON.parse(agent.skills),
    domains: JSON.parse(agent.domains),
  });

  // 2. 上传 IPFS
  const metadataUri = `ipfs://${await sdk.ipfsClient.addJson(registrationFile)}`;

  // 3. 注册为 Core NFT
  const result = await sdk.registerAgent(metadataUri, {
    collectionPointer: AGENTHUB_COLLECTION_POINTER,
  });

  return {
    assetAddress: result.asset.toBase58(),
    ipfsCid: metadataUri.replace('ipfs://', ''),
    ipfsUri: metadataUri,
  };
}
```

### 9.5 Feedback 提交（Receipt + Rating 上链）

```typescript
// packages/chain/src/feedback.ts
import { PublicKey, Tag } from '8004-solana';

// Receipt 关联的交易反馈（自动 Worker 调用）
export async function submitReceiptFeedback(agentAsset: string, receipt: ReceiptRecord) {
  const feedbackDetail = {
    agentRegistry: `solana:devnet:${ERC8004_PROGRAM_ID}`,
    agentId: receipt.agentId,
    clientAddress: receipt.consumerWallet,
    createdAt: new Date().toISOString(),
    value: 100,
    valueDecimals: 0,
    tag1: 'transaction',
    tag2: 'completed',
    endpoint: receipt.endpointUrl,
    proofOfPayment: {
      fromAddress: receipt.consumerWallet,
      toAddress: receipt.providerWallet,
      chainId: 'solana:devnet',
      txHash: receipt.paymentTx,
    },
  };

  const feedbackUri = `ipfs://${await sdk.ipfsClient.addJson(feedbackDetail)}`;

  await sdk.giveFeedback(new PublicKey(agentAsset), {
    value: '100',
    tag1: Tag.starred,
    tag2: 'transaction',
    feedbackUri,
  });

  return { feedbackUri, ipfsCid: feedbackUri.replace('ipfs://', '') };
}

// 用户主动评分（Consumer 评分后调用）
export async function submitRatingFeedback(agentAsset: string, rating: RatingRecord) {
  const value = String(rating.score * 20); // 1-5 → 20-100 百分制

  const feedbackDetail = {
    agentId: rating.agentId,
    clientAddress: rating.consumerWallet,
    createdAt: new Date().toISOString(),
    value: rating.score * 20,
    valueDecimals: 0,
    tag1: 'starred',
    tag2: 'user_rating',
    comment: rating.comment,
  };

  const feedbackUri = `ipfs://${await sdk.ipfsClient.addJson(feedbackDetail)}`;

  await sdk.giveFeedback(new PublicKey(agentAsset), {
    value,
    tag1: Tag.starred,
    tag2: 'user_rating',
    feedbackUri,
  });

  return { feedbackUri };
}
```

### 9.6 链上 Agent 查询（Web/CLI 用）

```typescript
// packages/chain/src/agent-query.ts
import { PublicKey } from '8004-solana';

// 查询单个 Agent 的链上信息
export async function getAgentOnChainInfo(assetAddress: string) {
  const asset = new PublicKey(assetAddress);
  const agent = await sdk.loadAgent(asset);       // 链上 Identity 信息
  const summary = await sdk.getSummary(asset);     // 聚合声誉摘要

  return {
    identity: {
      assetAddress,
      creator: agent.creator,
      owner: agent.owner,
      metadataUri: agent.uri,
    },
    reputation: {
      averageScore: summary.averageScore,
      totalFeedbacks: summary.totalFeedbacks,
    },
  };
}

// 查询 Agent 的所有 Feedback 列表
export async function getAgentFeedbacks(assetAddress: string) {
  const asset = new PublicKey(assetAddress);
  const feedbacks = await sdk.readAllFeedback(asset);
  return feedbacks;
}

// 验证 Agent 存活状态（ping endpoint）
export async function checkAgentLiveness(assetAddress: string) {
  const asset = new PublicKey(assetAddress);
  const report = await sdk.isItAlive(asset);
  // report.status: 'live' | 'partially' | 'not_live'
  return report;
}

// 只读模式查询（无需 signer，Web 前端可直接用）
export function createReadOnlySDK() {
  return new SolanaSDK({ cluster: 'devnet', rpcUrl: SOLANA_RPC_URL });
}
```

### 9.7 Web 端链上信息展示

```
Marketplace Agent 详情页 /marketplace/[id]
├── 基本信息（来自 DB）
│   ├── Name / Description / Tags / Pricing
│   └── Provider 地址
│
├── 链上身份 ✓ On-chain Verified    ← ERC-8004 Identity
│   ├── Asset Address → 可点击跳转 Solana Explorer
│   ├── IPFS Metadata → 解析展示 Registration File
│   │   ├── services（MCP/A2A endpoint）
│   │   ├── skills / domains
│   │   └── x402Support: true
│   ├── Creator / Owner 地址
│   └── "View on 8004scan" 外链
│
├── 声誉信息                        ← ERC-8004 Reputation
│   ├── 综合评分（sdk.getSummary）
│   ├── 反馈总数
│   ├── 评分趋势图
│   └── 近期 Feedback 列表
│       ├── tag1: "starred" → 用户评分
│       ├── tag1: "transaction" → 交易完成
│       └── 各 Feedback 可展开查看 IPFS 详情（含 proofOfPayment）
│
└── 存活检测                        ← sdk.isItAlive()
    └── Endpoint 状态: 🟢 Live / 🟡 Partial / 🔴 Not Live
```

### 9.8 Feedback Worker

Gateway 启动时运行 `setInterval` 轮询（替代原 receipt-anchor + reputation-anchor 两个 Worker）：

```
每 30 秒：
1. 查 Receipt 表 where feedbackStatus = "pending" AND retryCount < 3
   → 调 submitReceiptFeedback(agent.solAssetAddress, receipt)
   → 成功: 更新 feedbackStatus = "submitted", feedbackTx, feedbackIpfsCid
   → 失败: retryCount++

2. 查 Rating 表 where feedbackStatus = "pending" AND retryCount < 3
   → 调 submitRatingFeedback(agent.solAssetAddress, rating)
   → 成功: 更新 feedbackStatus = "submitted", feedbackTx, feedbackIpfsCid
   → 失败: retryCount++
```

失败时指数退避重试，3 次失败标记为 "failed"，Admin 可手动触发补跑。

### 9.9 ERC-8004 Feedback Tag 规范

| tag1 | tag2 | 含义 | value 取值 | 谁触发 |
|------|------|------|-----------|--------|
| `transaction` | `completed` | x402 交易完成 | `100`（固定） | Feedback Worker（自动） |
| `starred` | `user_rating` | 用户主动评分 | `20`-`100`（score*20） | Feedback Worker（用户评分后） |
| `uptime` | `liveness` | 端点存活检测 | `0` 或 `100` | 可选：定时检测 Worker |

---

## 10. 部署方案

### 10.1 Docker Compose 一键部署

```yaml
# agenthub-gateway/docker-compose.yml
version: '3.8'

services:
  gateway:
    build:
      context: .
      dockerfile: Dockerfile.gateway
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data    # SQLite 数据目录
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/data/agenthub.db?journal_mode=WAL
      - JWT_SECRET=${JWT_SECRET}
      - AGENTHUB_SOLANA_RPC_URL=${AGENTHUB_SOLANA_RPC_URL:-https://devnet.helius-rpc.com/?api-key=ea3297f1-582d-4b7d-b287-ecd5c8b05ecb}
      - PLATFORM_WALLET_SECRET_KEY=${PLATFORM_WALLET_SECRET_KEY}
      - USDC_MINT_ADDRESS=${USDC_MINT_ADDRESS}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      # ERC-8004 + IPFS
      - PINATA_JWT=${PINATA_JWT}
      - PINATA_GATEWAY=${PINATA_GATEWAY:-https://gateway.pinata.cloud}
      - AGENTHUB_COLLECTION_POINTER=${AGENTHUB_COLLECTION_POINTER}
      - ERC8004_INDEXER_URL=${ERC8004_INDEXER_URL:-https://8004-indexer-dev.qnt.sh}
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_GATEWAY_URL=http://gateway:8080
      - NEXT_PUBLIC_SOLANA_RPC_URL=${AGENTHUB_SOLANA_RPC_URL:-https://devnet.helius-rpc.com/?api-key=ea3297f1-582d-4b7d-b287-ecd5c8b05ecb}
      - NEXT_PUBLIC_USDC_MINT=${USDC_MINT_ADDRESS}
    depends_on:
      - gateway
    restart: unless-stopped
```

### 10.2 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| Gateway | 8080 | REST API |
| Web | 3000 | Next.js 前端 |

### 10.3 部署步骤

```bash
# 1. 初始化 ERC-8004 Collection（一次性）
#    无需部署合约！8004 Program 已预部署在 Solana Devnet
#    只需创建 AgentHub 的 Agent Collection：
cd agenthub-gateway
npx tsx scripts/init-collection.ts
# → 输出 AGENTHUB_COLLECTION_POINTER，写入 .env

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入:
#   PLATFORM_WALLET_SECRET_KEY  ← 平台钱包（用于 Agent 注册 + Feedback 提交）
#   JWT_SECRET
#   PINATA_JWT                  ← Pinata API key（IPFS 上传）
#   AGENTHUB_COLLECTION_POINTER ← 步骤 1 的输出
#   ANTHROPIC_API_KEY           ← 匹配 rerank 用

# 3. 一键启动
docker compose up --build

# 4. 初始化数据
docker compose exec gateway npx prisma db push
docker compose exec gateway npx tsx prisma/seed.ts

# 5. Plugin 安装（用户本地）
cd agenthub-plugin
npm install && npm run build
# Claude Code 中配置 MCP Server
```

---

## 11. 开发分工与防冲突

### 11.1 三人分工

| 角色 | 负责范围 | 独占目录 |
|------|---------|---------|
| **Dev A** | Marketplace + Provider | `routes/public-market/`、`routes/provider/`、`services/market/`、`services/provider/`、`web/src/app/marketplace/`、`web/src/app/provider/`、`types/market.ts`、`types/provider.ts`、`errors/market.ts`、`errors/provider.ts` |
| **Dev B** | Consumer Web + Admin | `routes/admin/`、`services/admin/`、`web/src/app/dashboard/`、`web/src/app/orders/`、`web/src/app/receipts/`、`web/src/app/wallet/`、`web/src/app/login/`、`web/src/app/admin/`、`types/admin.ts`、`errors/admin.ts` |
| **Dev C** | Plugin + Consumer Gateway | `agenthub-plugin/` 全部、`routes/public-auth/`、`routes/consumer/`、`services/auth.service.ts`、`services/consumer/`、`types/consumer.ts`、`errors/consumer.ts` |

### 11.2 你管理的基建（开工前输出）

```
你先输出（Day 0）：
├── prisma/schema.prisma              ← 冻结，后续改动统一收口
├── prisma/seed.ts
├── gateway/src/index.ts              ← 自动路由加载
├── gateway/src/lib/route-loader.ts
├── gateway/src/lib/prisma.ts
├── gateway/src/lib/errors/index.ts
├── gateway/src/middleware/*
├── gateway/src/chain/*               ← ERC-8004 SDK 封装 + IPFS + tx-verify
├── gateway/src/workers/feedback.worker.ts  ← 统一 Feedback 上链 Worker
├── packages/types/src/common.ts
├── packages/types/src/index.ts
├── packages/auth/*                   ← 第一版
├── packages/chain/*                  ← ERC-8004 SDK 封装（替代原 packages/solana/）
├── scripts/init-collection.ts        ← 初始化 Agent Collection
├── web/src/app/layout.tsx            ← 全局导航框架
├── web/src/app/page.tsx              ← 首页
├── web/src/lib/wallet.ts             ← 浏览器钱包管理
├── web/src/lib/auth.ts               ← 认证状态管理
├── docker-compose.yml
├── .env.example
└── pnpm-workspace.yaml
```

### 11.3 防冲突规则

| 规则 | 说明 |
|------|------|
| **路由自动加载** | `routes/*/index.ts` 自动扫描注册，不碰 `src/index.ts` |
| **目录独占** | 每人只在自己的 routes/services/页面目录下写代码 |
| **Schema 收口** | 改 schema 找你提需求，你统一修改 |
| **共享包冻结** | `packages/auth/`、`packages/chain/` 你先输出第一版，后续改动需 review |
| **类型按模块拆** | 每人在 `types/{my-module}.ts` 中添加，不碰别人的文件 |
| **错误码按模块拆** | 每人在 `errors/{my-module}.ts` 中添加 |
| **Web API client 按模块拆** | `api/market.ts`(A)、`api/consumer.ts`(B)、`api/admin.ts`(B) |
| **Web 组件按模块拆** | `components/marketplace/`(A)、`components/consumer/`(B) 等 |

### 11.4 Git 分支策略

```
main (protected)
├── feat/dev-a-marketplace-provider
├── feat/dev-b-consumer-admin
└── feat/dev-c-plugin-consumer-api
```

| 规则 | 说明 |
|------|------|
| main 保护 | 必须 PR 合入 |
| 你先合入 | Day 0 基建 PR 第一个合 main |
| 独占目录 self-merge | 只改自己独占目录的 PR 可以自行 merge |
| 共享文件需你 review | 碰 schema / auth / chain / layout 的 PR 你批准 |
| 每日 rebase main | 保持同步 |
| commit 前缀 | `feat(dev-a):` / `feat(dev-b):` / `feat(dev-c):` |

### 11.5 开发时间线

```
Day 0 AM    你 → main        基建全部落地
Day 0 PM    Dev A/B/C        从 main checkout 各自分支
Day 1-2     各分支独立开发    每天 rebase main
Day 2 PM    你 → main        auth/chain(ERC-8004) 真实实现替换 mock
Day 3 AM    Dev A/B/C → main 各模块合入
Day 3 PM    全员              联调修复
Day 4       全员              Demo 打磨
```

---

## 12. 错误码体系

按模块拆分，每人独占自己的文件：

```typescript
// errors/auth.ts
export const AUTH_ERRORS = {
  MISSING_TOKEN:         { status: 401, message: '缺少 Token' },
  INVALID_TOKEN:         { status: 401, message: 'Token 无效或已过期' },
  CHALLENGE_NOT_FOUND:   { status: 400, message: 'Challenge 不存在' },
  CHALLENGE_EXPIRED:     { status: 400, message: 'Challenge 已过期' },
  INVALID_SIGNATURE:     { status: 400, message: '签名验证失败' },
  ADMIN_AUTH_FAILED:     { status: 401, message: '账号或密码错误' },
} as const;

// errors/consumer.ts — Dev C 独占
export const CONSUMER_ERRORS = {
  NO_MATCH:              { status: 404, message: '暂无匹配 Agent' },
  INVALID_TX:            { status: 400, message: '交易验证失败' },
  TX_NOT_FOUND:          { status: 400, message: '链上交易不存在' },
  AMOUNT_MISMATCH:       { status: 400, message: '支付金额不符' },
  PAYER_MISMATCH:        { status: 400, message: '付款方与当前钱包不一致' },
  RECEIPT_NOT_FOUND:     { status: 404, message: '收据不存在' },
  RECEIPT_ALREADY_RATED: { status: 400, message: '该收据已评分' },
  NOT_YOUR_RECEIPT:      { status: 403, message: '只能对自己的收据评分' },
} as const;

// errors/market.ts — Dev A 独占
export const MARKET_ERRORS = {
  AGENT_NOT_FOUND:       { status: 404, message: 'Agent 不存在' },
  AGENT_NOT_ACTIVE:      { status: 400, message: 'Agent 当前不可用' },
} as const;

// errors/provider.ts — Dev A 独占
export const PROVIDER_ERRORS = {
  NOT_YOUR_AGENT:        { status: 403, message: '只能管理自己的 Agent' },
  AGENT_UNDER_REVIEW:    { status: 400, message: 'Agent 审核中，不可编辑' },
} as const;

// errors/admin.ts — Dev B 独占
export const ADMIN_ERRORS = {
  AGENT_ALREADY_ACTIVE:  { status: 400, message: 'Agent 已上链' },
  ERC8004_REGISTER_FAILED: { status: 500, message: 'ERC-8004 Agent 注册失败' },
  IPFS_UPLOAD_FAILED:    { status: 500, message: 'IPFS 元数据上传失败' },
  FEEDBACK_SUBMIT_FAILED:{ status: 500, message: 'ERC-8004 Feedback 提交失败' },
} as const;

// errors/index.ts — 你管理（合并导出）
export const ERRORS = {
  ...AUTH_ERRORS,
  ...CONSUMER_ERRORS,
  ...MARKET_ERRORS,
  ...PROVIDER_ERRORS,
  ...ADMIN_ERRORS,
} as const;
```

---

## 13. x402 Agent 模板（Provider 参考）

Provider 需要自建 x402 服务端。平台提供参考模板：

```typescript
// 一个最简 x402 Agent 服务端示例
import express from 'express';
import { Connection, Keypair, Transaction } from '@solana/web3.js';

const app = express();
const PRICE_USDC_MICRO = 80000; // $0.08
const RECIPIENT = Keypair.fromSecretKey(...); // Provider 钱包

app.post('/execute', async (req, res) => {
  const xPayment = req.headers['x-payment'];

  if (!xPayment) {
    // 返回 402 告知价格
    return res.status(402).json({
      x402Version: 1,
      accepts: [{
        scheme: 'exact',
        network: 'solana:devnet',
        asset: 'USDC',
        amount: String(PRICE_USDC_MICRO),
        payTo: RECIPIENT.publicKey.toBase58(),
        maxTimeoutSeconds: 60,
      }],
    });
  }

  // 解码、验证、广播交易
  const payload = JSON.parse(Buffer.from(xPayment, 'base64').toString());
  const tx = Transaction.from(
    Buffer.from(payload.payload.serializedTransaction, 'base64')
  );

  // 验证转账指令...
  // 模拟 → 广播 → 确认
  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=ea3297f1-582d-4b7d-b287-ecd5c8b05ecb');
  const sig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(sig, 'confirmed');

  // 执行 Agent 业务逻辑
  const result = await executeTask(req.body.task);

  // 返回结果 + PAYMENT-RESPONSE
  const settlementResponse = {
    success: true,
    transaction: sig,
    network: 'solana:devnet',
    payer: tx.signatures[0].publicKey.toBase58(),
    amount: String(PRICE_USDC_MICRO),
  };

  res.setHeader(
    'payment-response',
    Buffer.from(JSON.stringify(settlementResponse)).toString('base64')
  );

  return res.json({ result });
});
```

---

## 14. MVP 必做 vs 不做

| 必须真实实现 | 不进 MVP |
|------------|---------|
| `ah:run` 完整端到端（x402 真实支付） | Phantom 钱包集成 |
| x402 USDC 支付（Consumer → Agent 直接付费） | 微服务拆分 |
| ERC-8004 Agent 注册（Core NFT + IPFS 元数据，链上可查） | 多链支持（仅 Solana Devnet） |
| ERC-8004 Feedback 上链（交易反馈 + 用户评分） | Escrow / 分阶段结算 |
| 能力匹配（含推荐理由） | DAO 治理 |
| Provider 提交 + Admin 审批 → ERC-8004 上链 | 复杂推荐算法 |
| Web 展示链上 Agent 身份 + 声誉 | ATOM 信任引擎 |
| Consumer Web Dashboard | 移动端 |
| Marketplace 浏览 + 链上验证 | Admin RBAC |
| CLI→Web 免登录跳转 | ProofPass 验证反馈 |
| 至少 1 个真实 x402 Agent 可运行 | Validation Registry |

---

## 15. Demo 剧本

```
Part 1: CLI Demo（60s）

1. ah:connect → 钱包已连接，余额 10.00 USDC
2. ah:market → 展示 3 个 Agent（SecurityAgent / ResearchAgent / CodeReviewAgent）
   每个 Agent 显示 ✓ On-chain 标记 + ERC-8004 Asset 地址
3. ah:run "audit this Solana program for reentrancy vulnerabilities"
   → 匹配 SecurityAgent $0.08 ★4.8（链上声誉来自 ERC-8004 Reputation）
   → 确认 y
   → x402 支付 → Agent 执行 → 结果展示 + Feedback 上链
4. 评分 5 星 → ERC-8004 Feedback (tag1=starred, value=100) 上链

Part 2: Web Demo（60s）

5. ah:dashboard → 浏览器自动打开 Web 端
6. Dashboard 展示：刚才的订单、花费趋势、链上 Feedback 状态
7. 切换到 Provider 视图 → 收到的订单、收入报表
8. 打开 Marketplace → 搜索 Agent → 查看详情
   → 展示 ERC-8004 链上身份（Core NFT 地址、IPFS 元数据）
   → 展示链上声誉（评分趋势、Feedback 列表、proofOfPayment）
   → "View on 8004scan" 跳转外部浏览器验证
9. 打开 Solana Explorer → 链上 Agent NFT + Feedback 真实存在

核心叙事：CLI 执行 + x402 原生支付 + ERC-8004 链上身份与声誉 + Web 可视化验证
```

---

*AgentHub — The permissionless marketplace where AI agents earn their reputation on-chain, powered by ERC-8004 identity & x402 payments.*

---

## 16. 参考资料

| 资料 | 链接 | 说明 |
|------|------|------|
| ERC-8004 官方 EIP | https://eips.ethereum.org/EIPS/eip-8004 | Trustless Agents 标准规范 |
| 8004-solana-ts SDK | https://github.com/QuantuLabs/8004-solana-ts | ERC-8004 的 Solana TypeScript 实现（npm: `8004-solana`） |
| ERC-8004 EVM 合约参考 | https://github.com/erc-8004/erc-8004-contracts | Identity / Reputation / Validation Registry 合约源码 |
| 8004scan 浏览器 | https://8004scan.io | ERC-8004 Agent 链上浏览器 |
| ERC-8004 开发者指南 | https://blog.quicknode.com/erc-8004-a-developers-guide-to-trustless-ai-agent-identity/ | QuickNode 开发者教程 |
| x402 协议 | https://github.com/coinbase/x402 | Coinbase 开源 HTTP 402 支付协议 |
| Solana Core NFT 标准 | https://developers.metaplex.com/core | 8004-solana 底层使用的 NFT 标准 |
| Pinata IPFS | https://www.pinata.cloud | IPFS pinning 服务，Agent 元数据存储 |
| 8004-solana Indexer | https://github.com/QuantuLabs/8004-solana-indexer | 可自部署的 GraphQL 索引服务 |
