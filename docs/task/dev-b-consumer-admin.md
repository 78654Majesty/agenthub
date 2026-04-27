# Dev B 任务清单 — Consumer Web + Admin

> 分支: `feat/dev-b-consumer-admin`
> commit 前缀: `feat(dev-b):`
> 工作目录: `agenthub-gateway/`

---

## 独占目录

```
apps/gateway/src/routes/admin/
apps/gateway/src/routes/user/          ← 新增：统一用户路由
apps/gateway/src/services/admin/
apps/gateway/src/services/user/        ← 新增：统一用户服务
apps/web/src/app/dashboard/page.tsx    ← Dashboard Overview
apps/web/src/app/dashboard/orders/
apps/web/src/app/dashboard/receipts/
apps/web/src/app/login/
apps/web/src/app/admin/
apps/web/src/lib/api/consumer.ts
apps/web/src/lib/api/admin.ts
apps/web/src/components/consumer/
apps/web/src/components/admin/
packages/types/src/admin.ts
apps/gateway/src/lib/errors/admin.ts
```

---

## 开发顺序建议

先 Admin（独立认证体系，无外部依赖）→ 再 统一用户路由 → 最后 Web 页面。

---

## 任务列表

### B-1: 类型定义 + 错误码

- [ ] `packages/types/src/admin.ts`：
  - AdminLoginRequest/Response
  - AdminStats
  - AdminAgentListItem, AdminAgentApproveRequest/Response, AdminAgentRejectRequest
  - FailedReceipt, RetryResponse
  - AdminUser, AdminUserStats
  - UserDashboard, UnifiedOrder, UnifiedReceipt
- [ ] `lib/errors/admin.ts`：AGENT_ALREADY_ACTIVE, ERC8004_REGISTER_FAILED, IPFS_UPLOAD_FAILED, FEEDBACK_SUBMIT_FAILED

**验证**: TypeScript 编译通过

---

### B-2: Gateway — Admin 登录 `POST /v1/admin/auth/login`

- [ ] `services/admin/index.ts`：`adminLogin(username, password)` — 查 AdminUser + bcrypt 验证（P1 用 mock auth，P2 替换）+ 签发 Admin JWT `{ admin_id, username, role: "admin" }`
- [ ] `routes/admin/index.ts`：注册 POST /auth/login
- [ ] 返回 `{ token, admin_id, username, expires_in }`
- [ ] 401 返回 `{ error: "INVALID_CREDENTIALS", message: "Invalid username or password" }`

---

### B-3: Gateway — Admin 平台统计 `GET /v1/admin/stats`

- [ ] `services/admin/index.ts`：`getAdminStats()` — 聚合查询：
  - Agent COUNT by status (active/pending_review/rejected/suspended)
  - Order COUNT (total + this_week)
  - SUM(paymentAmount WHERE paymentVerified) — total + this_week
  - Wallet COUNT (active + new_this_month)
  - Receipt COUNT WHERE feedbackStatus="failed"
- [ ] `routes/admin/index.ts`：注册 GET /stats，需 verifyAdminSession 中间件

---

### B-4: Gateway — Admin Agent 列表 + 审批

- [ ] `services/admin/index.ts`：
  - `listAllAgents(query)` — 全部 Agent（含 pending），支持 status/sort/page 筛选
  - `approveAgent(agentId, note)` — 更新 status→active + 调 chain 包 registerAgentOnChain（P1 mock，P2 真实上链）
  - `rejectAgent(agentId, note)` — 更新 status→rejected + reviewNote
  - `suspendAgent(agentId, note)` — 更新 status→suspended
- [ ] `routes/admin/index.ts`：
  - GET /agents — 列表
  - GET /agents/:id — 详情
  - POST /agents/:id/approve — 审批通过（触发 ERC-8004 上链）
  - POST /agents/:id/reject — 拒绝
  - POST /agents/:id/suspend — 下架

**Approve 内部流程（P2 生效）**:
1. 验证 Agent status 不是 active
2. 调 `registerAgentOnChain(agent)` → { assetAddress, ipfsCid, ipfsUri }
3. 更新 Agent: status="active", solAssetAddress, ipfsCid, ipfsUri, chainStatus="registered", registeredAt

---

### B-5: Gateway — Admin 失败收据 + 重试

- [ ] `services/admin/index.ts`：
  - `listFailedReceipts(page, limit)` — WHERE feedbackStatus="failed"，JOIN Agent + Order
  - `retryReceipt(receiptId)` — 重置 feedbackStatus→pending + retryCount++（Worker 自动拾取）
- [ ] `routes/admin/index.ts`：
  - GET /receipts/failed
  - POST /receipts/:id/retry

---

### B-6: Gateway — Admin 用户管理

- [ ] `services/admin/index.ts`：
  - `listUsers(query)` — Wallet 列表 + 聚合：agents_count, orders_count, spending_usdc, revenue_usdc, last_active。支持 search(pubkey LIKE) / sort(last_active|spending|revenue|agents|orders)
  - `getUserStats()` — total_wallets, active_this_week, new_this_month
- [ ] `routes/admin/index.ts`：
  - GET /users
  - GET /users/stats

**聚合计算**:
- `spending_usdc = SUM(Order.paymentAmount WHERE consumerWalletId=wallet AND paymentVerified) / 1_000_000`
- `revenue_usdc = SUM(Order.paymentAmount WHERE agent.providerWalletId=wallet AND paymentVerified) / 1_000_000`

---

### B-7: Gateway — 统一 Dashboard `GET /v1/user/dashboard`

- [ ] 新建 `routes/user/index.ts` + `services/user/index.ts`
- [ ] `getUserDashboard(walletId)` — 合并 Consumer 消费 + Provider 收入：
  - spending: SUM/COUNT Order WHERE consumerWalletId (total + this_month)
  - revenue: SUM/COUNT Order WHERE agent.providerWalletId (total + this_month + growth_pct)
  - agents: COUNT Agent by status
  - rating: AVG + COUNT Rating WHERE agent.providerWalletId
- [ ] 需 verifyWalletJwt 中间件
- [ ] 零值友好：无 Consumer/Provider 记录时返回零值不报错

---

### B-8: Gateway — 统一订单 `GET /v1/user/orders`

- [ ] `services/user/index.ts`：`listUserOrders(walletId, query)` —
  - 合并查询：WHERE consumerWalletId=wallet OR agent.providerWalletId=wallet
  - 计算 `type`: initiated / received
  - 计算 `counterparty_wallet`: initiated→provider 钱包 / received→consumer 钱包
  - 支持 search / type / status / agent_id / sort / page / limit / format(csv)
- [ ] `routes/user/index.ts`：注册 GET /orders

---

### B-9: Gateway — 统一凭证 `GET /v1/user/receipts`

- [ ] `services/user/index.ts`：`listUserReceipts(walletId, query)` —
  - 合并：WHERE consumerWalletId=wallet OR agent.providerWalletId=wallet
  - 计算 `type`: payment / received
  - JOIN Order 获取 paymentTx / paymentNetwork
  - 支持 type / search / page / limit
- [ ] `routes/user/index.ts`：注册 GET /receipts

---

### B-10: Web API Client

- [ ] `lib/api/consumer.ts`：
  - `fetchDashboard()`
  - `fetchOrders(params)` — search/type/status/agent_id/sort/page
  - `fetchReceipts(params)` — type/search/page
- [ ] `lib/api/admin.ts`：
  - `adminLogin(username, password)`
  - `fetchAdminStats()`
  - `fetchAdminAgents(params)` — status/sort/page
  - `approveAgent(id, note)`
  - `rejectAgent(id, note)`
  - `suspendAgent(id, note)`
  - `fetchFailedReceipts(page, limit)`
  - `retryReceipt(id)`
  - `fetchAdminUsers(params)` — search/sort/page
  - `fetchAdminUserStats()`

---

### B-11: Web — 钱包登录页 `/login`

- [ ] `app/login/page.tsx`：如果项目负责人没做全局 Modal，则做独立登录页
- [ ] 钱包选择 → 签名 → JWT → 跳转 /dashboard
- [ ] 或作为全局 Modal 组件配合 navbar 使用

**注意**: 认证流程调用的是 Dev C 的 `/v1/public/auth/*` 路由。P1 阶段使用 mock-auth 中间件，无需真实签名。

---

### B-12: Web — 统一 Dashboard `/dashboard`

- [ ] `app/dashboard/page.tsx`：Dashboard Overview
- [ ] 区块：
  - 统计卡片 × 4：Spending / Revenue / My Agents / Avg. Rating — 调用 `GET /v1/user/dashboard`
  - Recent Orders 面板（最近 5 条混合订单）— 调用 `GET /v1/user/orders?limit=5`
    - Type badge: Initiated(紫色+arrow-up-right) / Received(绿色+arrow-down-left)
  - My Agents 面板（最近 4 个 Agent）— 调用 `GET /v1/provider/agents?limit=4`（Dev A 的 API）
- [ ] SSR 并行请求 3 个 API

---

### B-13: Web — 统一订单页 `/dashboard/orders`

- [ ] `app/dashboard/orders/page.tsx`
- [ ] 区块：
  - 搜索框（Order ID / Agent / 对方钱包）
  - 类型筛选 Tab（All / Initiated / Received）
  - 状态筛选（All / Completed / Failed / Pending）
  - Agent 筛选下拉
  - 订单表格：Order ID / **Type badge** / Agent / Counterparty / Amount / Status / Payment TX / Time
  - 分页 + Export CSV 按钮
- [ ] Type badge 视觉规范：
  - Initiated: 紫色 (#EEF2FF/#6366F1) + arrow-up-right + 红色金额 (-2.5 USDC)
  - Received: 绿色 (#F0FDF4/#10B981) + arrow-down-left + 绿色金额 (+1.8 USDC)
- [ ] Dashboard Layout（sidebar "Orders" 高亮）

---

### B-14: Web — 支付凭证页 `/dashboard/receipts`

- [ ] `app/dashboard/receipts/page.tsx`
- [ ] 区块：
  - 搜索框（TX Hash / Agent）
  - 类型筛选（All / Payment / Received）
  - 凭证表格：TX Hash / Type / Agent / Amount / Network / Status / Time
  - 分页
- [ ] Dashboard Layout（sidebar "Receipts" 高亮）

---

### B-15: Web — Admin 登录页 `/admin/login`

- [ ] `app/admin/login/page.tsx`：居中登录卡片
- [ ] Logo + "Admin" 标识
- [ ] 表单：Username + Password + Sign In 按钮
- [ ] 底部提示 "Protected by session-based authentication"
- [ ] 成功 → 存 admin_token cookie → 跳转 `/admin/dashboard`
- [ ] 失败 → 显示 "Invalid username or password"

---

### B-16: Web — Admin Dashboard `/admin/dashboard`

- [ ] `app/admin/dashboard/page.tsx`
- [ ] Admin 侧边栏：Dashboard(active) / Agent Review / Users / Failed Receipts
  - Agent Review 显示 pending 计数 badge
  - Failed Receipts 显示失败计数 badge
- [ ] 统计卡片行：Total Agents / Pending Review / Total Orders / Total Revenue / Active Wallets
- [ ] Recent Submissions 面板（最近 5 个提交的 Agent）
- [ ] Failed Receipts 面板（最近 5 条失败收据 + Retry 按钮）

---

### B-17: Web — Admin Agent Review `/admin/agents`

- [ ] `app/admin/agents/page.tsx`
- [ ] 状态筛选 Tab：All / Pending / Active / Rejected / Suspended（带计数）
- [ ] Agent 表格：Name / Provider Wallet / Price / Tags / Status Badge / Submitted / Actions
- [ ] 操作按钮（按状态条件渲染）：
  - Pending → Approve（绿色）+ Reject（红色）
  - Active → Suspend（橙色）
  - Rejected → 显示 reviewNote
- [ ] Approve 弹窗确认：可填 note → 调用 `POST /v1/admin/agents/:id/approve`
- [ ] Reject 弹窗：必填 note → 调用 `POST /v1/admin/agents/:id/reject`
- [ ] 操作成功 → Toast + 刷新列表

---

### B-18: Web — Admin Failed Receipts `/admin/receipts`

- [ ] `app/admin/receipts/page.tsx`
- [ ] 警告横幅：⚠ "N receipts require attention"
- [ ] 失败收据表格：Receipt ID / Agent / Consumer / Amount / Error / Retries / Action
- [ ] Retry 按钮 → 调用 `POST /v1/admin/receipts/:id/retry`
- [ ] 成功 → Toast "Retry enqueued" + 状态变为 pending
- [ ] 失败（已提交） → Toast "Already submitted"

---

### B-19: Web — Admin Users `/admin/users`

- [ ] `app/admin/users/page.tsx`
- [ ] 统计卡片行：Total Wallets / Active This Week / New This Month — 调用 `GET /v1/admin/users/stats`
- [ ] 搜索栏（钱包地址）
- [ ] 用户表格：Wallet / Agents / Orders / Spending / Revenue / Last Active
- [ ] 排序：last_active / spending / revenue / agents / orders
- [ ] 分页

---

## 验收标准

1. **Admin 全套** 登录 → Dashboard → Agent Review 审批 → Failed Receipts 重试 → Users 列表
2. **统一 Dashboard** 消费 + 收入统计 + Recent Orders（Type badge 正确）+ My Agents 面板
3. **统一订单** Initiated + Received 混合展示，Type/counterparty/金额颜色正确
4. **支付凭证** TX Hash + Network + 类型筛选
5. **Gateway 路由** 所有 `/v1/admin/*` 和 `/v1/user/*` curl 可访问
6. **Admin 侧边栏** badge 计数实时更新

---

*最后更新: 2026-04-20*
