# 基建任务清单 — 项目负责人

> 范围: Prisma Schema、共享包、中间件、Layout、Docker、Chain/Auth 真实实现
> 分支: `feat/infra-day0` (P0) / 直接 main (P2)

---

## P0 — Day 0 AM（开工前交付）

Dev A/B/C 的所有工作依赖 P0 完成。

### P0-1: Prisma Schema + Migration + Seed

- [ ] 确认 `prisma/schema.prisma` 与 [database-design.md](../schema/database-design.md) v1.1 一致（8 张表）
- [ ] `npx prisma db push` 验证 SQLite 建表
- [ ] `prisma/seed.ts`：插入 1 个 AdminUser + 3 个测试 Wallet + 3 个 Agent（active）+ 若干 Order/Receipt/Rating
- **产出**: `prisma/schema.prisma`, `prisma/seed.ts`

### P0-2: Gateway 入口 + 路由框架

- [ ] `gateway/src/index.ts`：Fastify 启动 + CORS + JSON 解析 + route-loader 调用
- [ ] `gateway/src/lib/route-loader.ts`：扫描 `routes/*/index.ts` 自动注册
- [ ] `gateway/src/lib/prisma.ts`：Prisma Client 单例
- [ ] `gateway/src/config.ts`：环境变量读取 + 类型化
- **产出**: 4 个文件，`npm run dev` 可启动空 Gateway

### P0-3: 错误码框架

- [ ] `lib/errors/index.ts`：统一错误响应格式 + 合并导出
- [ ] `lib/errors/auth.ts`：Auth 错误码（MISSING_TOKEN, INVALID_TOKEN, CHALLENGE_*, INVALID_SIGNATURE, ADMIN_AUTH_FAILED）
- [ ] 为 Dev A/B/C 预留 `market.ts`, `provider.ts`, `consumer.ts`, `admin.ts` 骨架（空导出）
- **产出**: `lib/errors/` 目录

### P0-4: 中间件

- [ ] `middleware/mock-auth.ts`：开发用，从 header 读 wallet 或使用默认测试钱包，注入 `request.user = { wallet_pubkey }`
- [ ] `middleware/verify-wallet-jwt.ts`：骨架，P1 阶段调用 mock-auth，P2 替换为真实 JWT 验证
- [ ] `middleware/verify-admin-session.ts`：骨架，P1 阶段直接放行，P2 替换为真实 Session JWT 验证
- **产出**: `middleware/` 目录，Dev A/B/C 可直接 `import { verifyWalletJwt } from '../middleware/verify-wallet-jwt'`

### P0-5: 共享类型包

- [ ] `packages/types/src/common.ts`：PaginatedResponse, ApiError, WalletJwtPayload, AdminJwtPayload, AgentStatus, ChainStatus, FeedbackStatus 等基础类型
- [ ] `packages/types/src/index.ts`：re-export common + 各模块（Dev A/B/C 后续各自添加）
- [ ] `packages/types/package.json` + `tsconfig.json`
- **产出**: `packages/types/`

### P0-6: Auth 包骨架

- [ ] `packages/auth/src/challenge.ts`：`generateChallenge(wallet)` / `verifyChallenge(wallet, nonce)` — mock 实现（直接返回固定 nonce）
- [ ] `packages/auth/src/jwt.ts`：`signJwt(payload)` / `verifyJwt(token)` — mock 实现（返回固定 token）
- [ ] `packages/auth/src/wallet-sign.ts`：`verifyWalletSignature(pubkey, message, signature)` — mock（直接 return true）
- [ ] `packages/auth/src/admin-auth.ts`：`hashPassword(pw)` / `verifyPassword(pw, hash)` — mock（直接比较字符串）
- [ ] `packages/auth/src/index.ts`：统一导出
- **产出**: `packages/auth/`，Dev C 可 import 开发，P2 替换真实实现

### P0-7: Chain 包骨架

- [ ] `packages/chain/src/erc8004-sdk.ts`：SDK 初始化（mock，返回 null sdk）
- [ ] `packages/chain/src/ipfs-client.ts`：`uploadJson(data)` / `fetchJson(cid)` — mock（返回假 CID）
- [ ] `packages/chain/src/agent-register.ts`：`registerAgentOnChain(agent)` — mock（返回假 asset address）
- [ ] `packages/chain/src/feedback.ts`：`submitReceiptFeedback()` / `submitRatingFeedback()` — mock（直接标记 submitted）
- [ ] `packages/chain/src/agent-query.ts`：`getAgentOnChainInfo()` / `getAgentFeedbacks()` — mock（返回假数据）
- [ ] `packages/chain/src/tx-verify.ts`：`verifyTransaction(txSignature)` — mock（直接 return true）
- [ ] `packages/chain/src/types.ts`：ERC-8004 相关类型定义
- [ ] `packages/chain/src/index.ts`：统一导出
- **产出**: `packages/chain/`，Dev A/B 可 import 开发

### P0-8: Feedback Worker 骨架

- [ ] `workers/feedback.worker.ts`：`startFeedbackWorker()` — setInterval 30s，查 Receipt/Rating where feedbackStatus=pending，调用 chain 包（mock 阶段直接标记 submitted）
- **产出**: 1 个文件

### P0-9: Web 全局 Layout

- [ ] `web/src/app/layout.tsx`：HTML head + 全局 font + Tailwind provider
- [ ] `web/src/app/page.tsx`：Landing Page 骨架（Hero + Stats + Featured Agents + Trust Flow + Footer）
- [ ] `web/src/components/layout/navbar.tsx`：顶部导航（Logo + Marketplace + Connect Wallet）
- [ ] `web/src/components/layout/footer.tsx`：底部通用 Footer
- **产出**: 全局壳子可运行

### P0-10: Dashboard Layout + Sidebar

- [ ] `web/src/components/layout/dashboard-layout.tsx`：左侧 Sidebar + 右侧内容区
- [ ] `web/src/components/layout/sidebar.tsx`：MY ACCOUNT (Overview / Orders / Receipts) + PROVIDER (My Agents / New Agent / Ratings) 两区块
- [ ] `web/src/app/dashboard/layout.tsx`：引入 dashboard-layout（所有 /dashboard/* 子页面共享）
- **产出**: Dev A/B 的 Dashboard 子页面可直接在 layout 内开发

### P0-11: Web 基建

- [ ] `web/src/lib/wallet.ts`：浏览器端 keypair 管理骨架（WebCrypto + localStorage）
- [ ] `web/src/lib/auth.ts`：认证状态管理（cookie 读写 + JWT 解析 + isAuthenticated）
- [ ] `web/src/middleware.ts`：Next.js middleware — Dashboard 路由保护 + CLI token 处理 + Admin 路由保护
- **产出**: 3 个文件

### P0-12: Docker + 环境

- [ ] `docker-compose.yml`：gateway (8080) + web (3000)
- [ ] `Dockerfile.gateway`, `Dockerfile.web`
- [ ] `.env.example`：所有环境变量 + 注释
- [ ] `pnpm-workspace.yaml`：workspace 配置
- [ ] 根 `package.json` + `tsconfig.json`
- **产出**: `docker compose up --build` 可启动

### P0-13: ERC-8004 Collection 初始化脚本

- [ ] `scripts/init-collection.ts`：调用 8004-solana SDK 创建 Agent Collection，输出 AGENTHUB_COLLECTION_POINTER
- **产出**: 1 个脚本（P2 阶段实际运行）

---

## P2 — Day 2 PM（替换 Mock 为真实实现）

### P2-1: Auth 库真实实现

- [ ] `packages/auth/src/jwt.ts`：真实 JWT 签发/验证（jsonwebtoken 库 + JWT_SECRET）
- [ ] `packages/auth/src/challenge.ts`：真实 Challenge 生成（crypto.randomUUID + 5 分钟过期 + DB 存储）
- [ ] `packages/auth/src/wallet-sign.ts`：真实 Solana 签名验证（`@solana/web3.js` + nacl）
- [ ] `packages/auth/src/admin-auth.ts`：真实 bcrypt hash + verify
- [ ] 更新 `middleware/verify-wallet-jwt.ts`：从 mock 切换到真实 JWT 验证
- [ ] 更新 `middleware/verify-admin-session.ts`：从 mock 切换到真实 Admin JWT 验证
- **验证**: Dev C 的 auth routes 不改代码即可工作

### P2-2: Chain 库真实实现

- [ ] `packages/chain/src/erc8004-sdk.ts`：真实 SolanaSDK 初始化（devnet + 平台钱包 + Pinata）
- [ ] `packages/chain/src/ipfs-client.ts`：真实 Pinata 上传/读取
- [ ] `packages/chain/src/agent-register.ts`：真实 ERC-8004 Agent 注册（buildRegistrationFile + IPFS + registerAgent）
- [ ] `packages/chain/src/feedback.ts`：真实 Feedback 提交（giveFeedback + IPFS detail）
- [ ] `packages/chain/src/agent-query.ts`：真实链上查询（loadAgent + getSummary + readAllFeedback + isItAlive）
- [ ] `packages/chain/src/tx-verify.ts`：真实 getTransaction 验证
- [ ] 运行 `scripts/init-collection.ts` 创建 Collection
- **验证**: Admin Approve → IPFS 上传 + Core NFT 铸造成功

### P2-3: Feedback Worker 真实实现

- [ ] 替换 mock 为真实 chain 调用
- [ ] 指数退避重试逻辑（30s / 60s / 120s）
- [ ] 3 次失败标记 feedbackStatus = "failed"
- **验证**: Receipt 创建后 30s 内自动上链

### P2-4: Seed 数据增强

- [ ] 更新 seed.ts：插入完整测试数据（含链上注册过的 Agent、已完成的 Order/Receipt/Rating）
- [ ] 确保 Demo 用 Agent 有真实 solAssetAddress 和 ipfsCid

---

## 验收标准

### P0 完成标志
- `cd agenthub-gateway && pnpm install && pnpm dev` → Gateway 启动在 8080
- `cd apps/web && pnpm dev` → Web 启动在 3000，Landing + Dashboard Layout 可见
- `npx prisma db push && npx tsx prisma/seed.ts` → DB 有测试数据
- Dev A/B/C 可从 main checkout 各自分支并立即开始开发

### P2 完成标志
- `POST /v1/public/auth/verify` 真实签名验证通过
- `POST /v1/admin/agents/:id/approve` 触发 IPFS 上传 + Core NFT 铸造
- Feedback Worker 自动将 pending Receipt 上链
- Solana Explorer 可查到已注册 Agent 和 Feedback

---

*最后更新: 2026-04-20*
