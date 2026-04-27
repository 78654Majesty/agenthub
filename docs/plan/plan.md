# AgentHub 开发计划

> 版本: v1.0 | 日期: 2026-04-20 | 工期: 4 天（黑客松 MVP）
> 参考: [agenthub-spec-v1.md](../spec/agenthub-spec-v1.md) / [api-dependencies-web-pages.md](../spec/api-dependencies-web-pages.md) / [database-design.md](../schema/database-design.md)

---

## 一、里程碑总览

| 阶段 | 时间 | 负责人 | 交付物 | 状态 |
|------|------|--------|--------|------|
| P0 | Day 0 AM | 项目负责人 | 基建落地：Schema + 路由框架 + Mock Auth + 共享包骨架 + Docker | ⬜ |
| P1 | Day 0 PM ~ Day 2 | Dev A/B/C | 各模块独立开发（使用 mock-auth，无链上依赖） | ⬜ |
| P2 | Day 2 PM | 项目负责人 | 真实 Auth 库 + Chain 库（ERC-8004 SDK + Pinata IPFS） | ⬜ |
| P3 | Day 3 AM | Dev A/B/C | 合入 main + 联调修复 | ⬜ |
| P4 | Day 3 PM ~ Day 4 | 全员 | Demo 打磨 + Seed 数据 + 部署验证 | ⬜ |

---

## 二、阶段依赖关系图

```
P0 (基建)
 │
 ├──────────────────┬──────────────────┐
 │                  │                  │
 ▼                  ▼                  ▼
P1-A               P1-B              P1-C
(Marketplace       (Dashboard         (Plugin
 + Provider)        + Admin)           + Auth + Consumer API)
 │                  │                  │
 │   ┌──────────────┤                  │
 │   │              │                  │
 │   │  P2 (真实 Auth + Chain) ◄───────┤ (Dev C 的 auth.service 需真实 auth 库)
 │   │              │                  │
 ├───┴──────────────┴──────────────────┤
 │                                     │
 ▼                                     ▼
P3 (联调)                           P3 (联调)
 │                                     │
 └──────────────────┬──────────────────┘
                    │
                    ▼
                 P4 (Demo)
```

### 关键阻塞点

| 阻塞 | 被阻塞方 | 解决方案 |
|------|---------|---------|
| Auth 库未实现 | Dev A/B/C 所有需鉴权的路由 | P0 提供 `mock-auth.ts`，固定返回测试钱包 |
| Chain 库未实现 | Dev B 的 Admin Approve（触发上链） | P1 阶段 Approve 只改 DB status，P2 后补链上逻辑 |
| Consumer API 未实现 | Dev C 的 Plugin `run_agent_task` | Plugin 先 mock Gateway 响应，P3 联调时对接 |
| 统一侧边栏 Layout | Dev A/B 的 Dashboard 子页面 | P0 输出 Dashboard Layout + Sidebar 组件 |

---

## 三、人员任务分配

### 项目负责人（你）

**P0 交付清单：**

| # | 任务 | 产出文件 |
|---|------|---------|
| 1 | Prisma Schema 冻结 + Migration | `prisma/schema.prisma`, `prisma/seed.ts` |
| 2 | Gateway 入口 + 路由自动加载 | `gateway/src/index.ts`, `lib/route-loader.ts`, `lib/prisma.ts` |
| 3 | 错误码框架 + 合并导出 | `lib/errors/index.ts`, `lib/errors/auth.ts` |
| 4 | Mock Auth 中间件 | `middleware/mock-auth.ts`, `middleware/verify-wallet-jwt.ts`(骨架), `middleware/verify-admin-session.ts`(骨架) |
| 5 | 共享类型包 | `packages/types/src/common.ts`, `packages/types/src/index.ts` |
| 6 | Auth 包骨架 | `packages/auth/src/*.ts`（接口定义 + mock 实现） |
| 7 | Chain 包骨架 | `packages/chain/src/*.ts`（接口定义 + mock 实现） |
| 8 | Feedback Worker 骨架 | `workers/feedback.worker.ts` |
| 9 | Web 全局 Layout + Landing | `web/src/app/layout.tsx`, `web/src/app/page.tsx` |
| 10 | Dashboard Layout + Sidebar | `web/src/components/layout/` |
| 11 | Web 基建：wallet.ts + auth.ts | `web/src/lib/wallet.ts`, `web/src/lib/auth.ts` |
| 12 | Docker + 环境变量 | `docker-compose.yml`, `.env.example`, `Dockerfile.*` |
| 13 | Collection 初始化脚本 | `scripts/init-collection.ts` |

**P2 交付清单：**

| # | 任务 | 说明 |
|---|------|------|
| 1 | Auth 库真实实现 | JWT 签发/验证 + Challenge-Response + Admin bcrypt |
| 2 | Chain 库真实实现 | 8004-solana SDK 封装 + Pinata IPFS + tx-verify |
| 3 | Feedback Worker 真实实现 | Receipt + Rating → ERC-8004 Feedback 上链 |
| 4 | Middleware 切换 | mock-auth → 真实 verify-wallet-jwt / verify-admin-session |

详见 → [`task/infra-shared.md`](../task/infra-shared.md)

---

### Dev A — Marketplace + Provider

**范围：** 公开 Agent 列表/详情/链上信息 + Provider Agent CRUD + 评分展示

| 层 | 独占目录 |
|----|---------|
| Gateway 路由 | `routes/public-market/`, `routes/provider/` |
| Gateway 服务 | `services/market/`, `services/provider/` |
| Web 页面 | `app/marketplace/`, `app/dashboard/agents/`, `app/dashboard/ratings/` |
| Web API Client | `lib/api/market.ts`, `lib/api/provider.ts` |
| Web 组件 | `components/marketplace/`, `components/provider/` |
| 共享类型 | `packages/types/src/market.ts`, `packages/types/src/provider.ts` |
| 错误码 | `lib/errors/market.ts`, `lib/errors/provider.ts` |

**P1 任务数：16 个垂直切片**

详见 → [`task/dev-a-marketplace-provider.md`](../task/dev-a-marketplace-provider.md)

---

### Dev B — Consumer Web + Admin

**范围：** 统一 Dashboard + 订单 + 凭证 + 钱包登录 + Admin 全套

| 层 | 独占目录 |
|----|---------|
| Gateway 路由 | `routes/admin/`, `routes/user/`（新增统一用户路由） |
| Gateway 服务 | `services/admin/`, `services/user/`（新增） |
| Web 页面 | `app/dashboard/`(Overview), `app/dashboard/orders/`, `app/dashboard/receipts/`, `app/login/`, `app/admin/` |
| Web API Client | `lib/api/consumer.ts`, `lib/api/admin.ts` |
| Web 组件 | `components/consumer/`, `components/admin/` |
| 共享类型 | `packages/types/src/admin.ts` |
| 错误码 | `lib/errors/admin.ts` |

**注意：** api-dependencies-web-pages v4.0 新增了 `/v1/user/*` 统一路由（合并 Consumer + Provider 视角）。Dev B 负责这组新路由的 Gateway 实现。

**P1 任务数：18 个垂直切片**

详见 → [`task/dev-b-consumer-admin.md`](../task/dev-b-consumer-admin.md)

---

### Dev C — Plugin + Consumer Gateway API + Auth

**范围：** MCP Plugin 全部 + Auth 路由/服务 + Consumer Receipt/Rating 上报

| 层 | 独占目录 |
|----|---------|
| Plugin | `agenthub-plugin/` 全部 |
| Gateway 路由 | `routes/public-auth/`, `routes/consumer/` |
| Gateway 服务 | `services/auth.service.ts`, `services/match.service.ts`, `services/consumer/` |
| 共享类型 | `packages/types/src/consumer.ts` |
| 错误码 | `lib/errors/consumer.ts` |

**P1 任务数：16 个垂直切片**

详见 → [`task/dev-c-plugin-auth.md`](../task/dev-c-plugin-auth.md)

---

## 四、Git 分支策略

```
main (protected)
 │
 ├── feat/infra-day0          ← 项目负责人 P0（第一个合入 main）
 │
 ├── feat/dev-a-marketplace   ← Dev A（从 P0 后的 main checkout）
 ├── feat/dev-b-dashboard     ← Dev B（从 P0 后的 main checkout）
 └── feat/dev-c-plugin        ← Dev C（从 P0 后的 main checkout）
```

| 规则 | 说明 |
|------|------|
| P0 先合 main | Day 0 AM 基建 PR 合入后，Dev A/B/C 再 checkout |
| 独占目录 self-merge | 只改自己独占目录的 PR 可自行 merge |
| 共享文件需 review | 碰 schema / auth / chain / layout 的 PR 需项目负责人批准 |
| commit 前缀 | `feat(infra):` / `feat(dev-a):` / `feat(dev-b):` / `feat(dev-c):` |
| 每日 rebase main | 保持同步，P2 合入后各分支需立即 rebase |

---

## 五、API 路由归属总表

> 基于 [agenthub-spec-v1.md](../spec/agenthub-spec-v1.md) Section 7.1 + [api-dependencies-web-pages.md](../spec/api-dependencies-web-pages.md) v4.0 新增路由

| 路由 | 方法 | Owner | 说明 |
|------|------|-------|------|
| `/v1/public/auth/challenge` | GET | Dev C | 签名 challenge |
| `/v1/public/auth/verify` | POST | Dev C | 验证签名 → JWT |
| `/v1/public/match` | POST | Dev C | AI 能力匹配 |
| `/v1/public/market/stats` | GET | Dev A | 平台统计 |
| `/v1/public/market/agents` | GET | Dev A | Agent 列表 |
| `/v1/public/market/agents/:id` | GET | Dev A | Agent 详情 |
| `/v1/public/market/agents/:id/on-chain` | GET | Dev A | 链上身份+声誉 |
| `/v1/public/market/agents/:id/feedbacks` | GET | Dev A | Feedback 列表 |
| `/v1/consumer/receipts` | POST | Dev C | Receipt 上报（Plugin→Gateway） |
| `/v1/consumer/receipts/:id` | GET | Dev C | Receipt 详情 |
| `/v1/consumer/receipts/:id/on-chain` | GET | Dev C | Receipt 链上 Feedback |
| `/v1/consumer/ratings` | POST | Dev C | 评分提交 |
| `/v1/user/dashboard` | GET | **Dev B** | 统一 Dashboard 数据 (v4.0 新) |
| `/v1/user/orders` | GET | **Dev B** | 统一订单 (v4.0 新) |
| `/v1/user/receipts` | GET | **Dev B** | 统一凭证 (v4.0 新) |
| `/v1/provider/agents` | GET/POST | Dev A | Provider Agent CRUD |
| `/v1/provider/agents/:id` | GET/PATCH | Dev A | Agent 详情/编辑 |
| `/v1/provider/dashboard` | GET | Dev A | Provider 报表 |
| `/v1/provider/orders` | GET | Dev A | Provider 被调用历史 |
| `/v1/provider/ratings` | GET | Dev A | 收到的评分 |
| `/v1/provider/ratings/distribution` | GET | Dev A | 评分分布 |
| `/v1/admin/auth/login` | POST | Dev B | Admin 登录 |
| `/v1/admin/stats` | GET | Dev B | 平台统计 |
| `/v1/admin/agents` | GET | Dev B | 全部 Agent（含审核） |
| `/v1/admin/agents/:id/approve` | POST | Dev B | 审批通过→上链 |
| `/v1/admin/agents/:id/reject` | POST | Dev B | 审批拒绝 |
| `/v1/admin/agents/:id/suspend` | POST | Dev B | 强制下架 |
| `/v1/admin/receipts/failed` | GET | Dev B | 失败收据 |
| `/v1/admin/receipts/:id/retry` | POST | Dev B | 手动重试 |
| `/v1/admin/users` | GET | Dev B | 用户列表 |
| `/v1/admin/users/stats` | GET | Dev B | 用户统计 |

---

## 六、Web 页面归属总表

| 页面 | 路由 | Owner | 依赖 API Owner |
|------|------|-------|---------------|
| Landing | `/` | 项目负责人 | Dev A (stats, agents) |
| Marketplace 列表 | `/marketplace` | Dev A | Dev A |
| Marketplace 详情 | `/marketplace/[id]` | Dev A | Dev A |
| 钱包登录 Modal | 全局组件 | 项目负责人 | Dev C (auth) |
| 统一 Dashboard | `/dashboard` | Dev B | Dev B (user/dashboard), Dev A (provider/agents) |
| 统一订单 | `/dashboard/orders` | Dev B | Dev B (user/orders) |
| 支付凭证 | `/dashboard/receipts` | Dev B | Dev B (user/receipts) |
| Agent 列表 | `/dashboard/agents` | Dev A | Dev A (provider/agents) |
| 新建 Agent | `/dashboard/agents/new` | Dev A | Dev A (provider/agents POST) |
| Agent 详情 | `/dashboard/agents/[id]` | Dev A | Dev A (provider/agents/:id) |
| 评分 | `/dashboard/ratings` | Dev A | Dev A (provider/ratings) |
| Admin 登录 | `/admin/login` | Dev B | Dev B (admin/auth/login) |
| Admin Dashboard | `/admin/dashboard` | Dev B | Dev B |
| Admin Agent Review | `/admin/agents` | Dev B | Dev B |
| Admin Failed Receipts | `/admin/receipts` | Dev B | Dev B |
| Admin Users | `/admin/users` | Dev B | Dev B |

---

## 七、联调检查清单（P3）

### 端到端流程验证

- [ ] **CLI ah:connect** → Gateway Auth → JWT 颁发 → Plugin 持有 JWT
- [ ] **CLI ah:market** → Gateway public-market → Agent 列表返回
- [ ] **CLI ah:run** → match → x402 支付 → Receipt 上报 → Feedback Worker 上链
- [ ] **CLI ah:dashboard** → 浏览器打开 → token 免登录 → Dashboard 展示
- [ ] **Web 登录** → challenge → 签名 → JWT → Dashboard 跳转
- [ ] **Provider 提交 Agent** → pending_review → Admin Approve → ERC-8004 上链 → active
- [ ] **Marketplace 浏览** → Agent 列表 → 详情 → 链上信息 → 8004scan 跳转
- [ ] **Admin 失败收据** → Retry → Feedback Worker 重新上链
- [ ] **统一订单** → Initiated + Received 混合展示 → Type badge 正确

### 跨模块接口验证

| 调用方 | 被调用方 | 接口 | 验证点 |
|--------|---------|------|--------|
| Dev C (Plugin) | Dev C (consumer/receipts POST) | Receipt 上报 | tx_signature 验证、Order+Receipt 创建 |
| Dev B (Dashboard) | Dev A (provider/agents GET) | My Agents 面板 | JWT 鉴权、分页、status 筛选 |
| Dev B (Admin Approve) | 项目负责人 (chain 库) | ERC-8004 注册 | IPFS 上传 + Core NFT 铸造 |
| Dev A (on-chain) | 项目负责人 (chain 库) | Agent 链上查询 | loadAgent + getSummary |
| Dev B (user/orders) | Dev C (consumer 数据) + Dev A (provider 数据) | 统一订单 | type 计算、counterparty 计算 |

---

## 八、Harness 配置建议

每个 Dev 开 Claude Code session 时的推荐配置：

### Dev A
```bash
# 进入开发
cd agenthub-gateway
# 使用 /freeze 限制编辑范围
/freeze apps/gateway/src/routes/public-market apps/gateway/src/routes/provider apps/gateway/src/services/market apps/gateway/src/services/provider apps/web/src/app/marketplace apps/web/src/app/dashboard/agents apps/web/src/app/dashboard/ratings apps/web/src/lib/api/market.ts apps/web/src/lib/api/provider.ts apps/web/src/components/marketplace apps/web/src/components/provider packages/types/src/market.ts packages/types/src/provider.ts apps/gateway/src/lib/errors/market.ts apps/gateway/src/lib/errors/provider.ts
```

### Dev B
```bash
cd agenthub-gateway
/freeze apps/gateway/src/routes/admin apps/gateway/src/routes/user apps/gateway/src/services/admin apps/gateway/src/services/user apps/web/src/app/dashboard apps/web/src/app/login apps/web/src/app/admin apps/web/src/lib/api/consumer.ts apps/web/src/lib/api/admin.ts apps/web/src/components/consumer apps/web/src/components/admin packages/types/src/admin.ts apps/gateway/src/lib/errors/admin.ts
```

### Dev C
```bash
# Plugin 是独立项目
cd agenthub-plugin   # 或 cd agenthub-gateway 看具体任务
# Plugin 部分不需要 freeze（独占整个目录）
# Gateway 部分：
/freeze apps/gateway/src/routes/public-auth apps/gateway/src/routes/consumer apps/gateway/src/services/auth.service.ts apps/gateway/src/services/match.service.ts apps/gateway/src/services/consumer packages/types/src/consumer.ts apps/gateway/src/lib/errors/consumer.ts
```

---

*最后更新: 2026-04-20*
