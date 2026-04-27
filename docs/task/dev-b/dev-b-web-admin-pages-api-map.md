# Dev B 页面与功能接口梳理（Web 控台 + Admin 控台）

> 角色：Dev B（Consumer Web + Admin）  
> 依据文档：`docs/plan/plan.md`、`docs/spec/api-dependencies-web-pages.md`、`docs/task/dev-b-consumer-admin.md`  
> 日期：2026-04-22

---

## 1. 范围确认

Dev B 本次负责两条线：
- Web 控台（统一用户视角）：`/login`、`/dashboard`、`/dashboard/orders`、`/dashboard/receipts`
- Admin 控台：`/admin/login`、`/admin/dashboard`、`/admin/agents`、`/admin/receipts`、`/admin/users`

同时负责 Gateway 新增/维护接口：
- `/v1/user/*`（统一用户路由，v4.0 新增）
- `/v1/admin/*`

---

## 2. Web 控台页面与接口

### 2.1 `/login`（钱包登录页/登录能力）

页面功能：
- 钱包连接与签名登录
- 登录成功后写入 JWT 并跳转 `/dashboard`

接口依赖：
- `GET /v1/public/auth/challenge`（Owner: Dev C）
- `POST /v1/public/auth/verify`（Owner: Dev C）

说明：
- 该页由 Dev B 落地页面/交互，但认证接口由 Dev C 提供。

---

### 2.2 `/dashboard`（统一 Dashboard 总览）

页面功能：
- 统计卡片：`Spending / Revenue / My Agents / Avg Rating`
- 最近订单面板（Initiated + Received 混合）
- 我的 Agent 面板（最近 4 个）

接口依赖：
- `GET /v1/user/dashboard`（Owner: Dev B，JWT）
- `GET /v1/user/orders?limit=5`（Owner: Dev B，JWT）
- `GET /v1/provider/agents?limit=4`（Owner: Dev A，JWT）

关键展示规则：
- Recent Orders 的 `type` 必须区分：
  - `initiated`：我发起调用
  - `received`：我的 Agent 被调用

---

### 2.3 `/dashboard/orders`（统一订单）

页面功能：
- 搜索：Order ID / Agent / 对方钱包
- 筛选：Type、Status、Agent
- 列表字段：Order ID、Type、Agent、Counterparty、Amount、Status、Payment TX、Time
- 分页、CSV 导出

接口依赖：
- `GET /v1/user/orders`（Owner: Dev B，JWT）

建议请求参数：
- `search`、`type`、`status`、`agent_id`、`sort`、`page`、`limit`、`format=csv`

关键计算字段（接口返回）：
- `type`: `initiated | received`
- `counterparty_wallet`：根据 type 反向计算对手方钱包

---

### 2.4 `/dashboard/receipts`（支付凭证）

页面功能：
- 搜索：TX Hash / Agent
- 类型筛选：Payment / Received
- 列表字段：TX Hash、Type、Agent、Amount、Network、Status、Time
- 分页

接口依赖：
- `GET /v1/user/receipts`（Owner: Dev B，JWT）

建议请求参数：
- `type`、`search`、`page`、`limit`

关键计算字段（接口返回）：
- `type`: `payment | received`

---

## 3. Admin 控台页面与接口

### 3.1 `/admin/login`（管理员登录）

页面功能：
- 用户名密码登录
- 登录成功写入 `admin_token`，跳转 `/admin/dashboard`

接口依赖：
- `POST /v1/admin/auth/login`（Owner: Dev B，无需钱包 JWT）

---

### 3.2 `/admin/dashboard`（管理员总览）

页面功能：
- 平台统计卡片：Agent 数、待审核数、订单量、收入、活跃钱包
- Recent Submissions（最近 Agent 提交）
- Failed Receipts 摘要（最近失败收据）
- Sidebar badge：待审核数量、失败收据数量

接口依赖：
- `GET /v1/admin/stats`（Owner: Dev B，Admin Session）
- `GET /v1/admin/agents?sort=newest&limit=5`（Owner: Dev B，Admin Session）
- `GET /v1/admin/receipts/failed?limit=5`（Owner: Dev B，Admin Session）

---

### 3.3 `/admin/agents`（Agent 审核）

页面功能：
- 状态筛选：All/Pending/Active/Rejected/Suspended
- Agent 列表管理
- 审核动作：Approve / Reject / Suspend
- 审核备注（note）输入

接口依赖：
- `GET /v1/admin/agents`（Owner: Dev B，Admin Session）
- `POST /v1/admin/agents/:id/approve`（Owner: Dev B，Admin Session）
- `POST /v1/admin/agents/:id/reject`（Owner: Dev B，Admin Session）
- `POST /v1/admin/agents/:id/suspend`（Owner: Dev B，Admin Session）

说明：
- P1 可先走 mock/仅状态变更；
- P2 接入真实链上注册（approve 触发 ERC-8004 流程）。

---

### 3.4 `/admin/receipts`（失败收据）

页面功能：
- 展示失败收据（错误信息、重试次数等）
- 手动 Retry

接口依赖：
- `GET /v1/admin/receipts/failed`（Owner: Dev B，Admin Session）
- `POST /v1/admin/receipts/:id/retry`（Owner: Dev B，Admin Session）

---

### 3.5 `/admin/users`（用户钱包聚合视图）

页面功能：
- 统计卡片：Total Wallets / Active This Week / New This Month
- 钱包搜索与排序
- 聚合字段展示：Agents、Orders、Spending、Revenue、Last Active

接口依赖：
- `GET /v1/admin/users/stats`（Owner: Dev B，Admin Session）
- `GET /v1/admin/users`（Owner: Dev B，Admin Session）

建议请求参数：
- `search`、`sort(last_active|spending|revenue|agents|orders)`、`page`、`limit`

---

## 4. Dev B 需实现的接口清单（按模块）

### 4.1 用户统一路由（`/v1/user/*`）
- `GET /v1/user/dashboard`
- `GET /v1/user/orders`
- `GET /v1/user/receipts`

### 4.2 Admin 路由（`/v1/admin/*`）
- `POST /v1/admin/auth/login`
- `GET /v1/admin/stats`
- `GET /v1/admin/agents`
- `POST /v1/admin/agents/:id/approve`
- `POST /v1/admin/agents/:id/reject`
- `POST /v1/admin/agents/:id/suspend`
- `GET /v1/admin/receipts/failed`
- `POST /v1/admin/receipts/:id/retry`
- `GET /v1/admin/users`
- `GET /v1/admin/users/stats`

---

## 5. 跨角色接口依赖（Dev B 需要对齐）

- Dev B 页面依赖 Dev A：
  - `/dashboard` 的 My Agents 面板调用 `GET /v1/provider/agents?limit=4`
- Dev B 登录页依赖 Dev C：
  - 钱包登录调用 `/v1/public/auth/challenge`、`/v1/public/auth/verify`
- Dev B Admin Approve 在 P2 依赖项目负责人的 chain 能力：
  - 审批通过后触发 ERC-8004 注册/IPFS 元数据流程

---

## 6. 开发优先级建议

1. 先完成 Admin 登录与 Admin 读接口（`stats/agents/receipts/users`），快速打通管理后台可视化。  
2. 再实现 `/v1/user/*` 三个统一接口，保证 Dashboard/Orders/Receipts 主链路可用。  
3. 最后补齐 Admin 动作接口（approve/reject/suspend/retry）与前端交互细节。  

