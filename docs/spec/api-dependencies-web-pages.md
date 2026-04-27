# AgentHub Web 页面接口依赖说明

> 版本: v4.0 | 日期: 2026-04-20 | 范围: 未登录首页 + Marketplace + 钱包登录 + 统一 Dashboard（Consumer + Provider）+ Admin 管理

---

## 一、页面总览

> **设计原则**: 不区分 Consumer / Provider 身份，同一钱包登录后统一展示。侧边栏分为 MY ACCOUNT（Overview / Orders / Receipts）和 PROVIDER（My Agents / New Agent / Ratings）两个区块。Admin 独立体系，账号密码登录。


| 页面             | 路由                      | 描述                                                      | 负责人   |
| -------------- | ----------------------- | ------------------------------------------------------- | ----- |
| 未登录首页          | `/`                     | Landing page，展示平台价值主张、统计数据、精选 Agent、信任流程                  | 项目负责人 |
| Marketplace    | `/marketplace`          | Agent 完整列表，支持搜索、分类筛选、价格区间、排序、分页                          | Dev A |
| 钱包登录 Modal     | 全局组件                    | 钱包选择 → 签名 → JWT 获取                                      | 项目负责人 |
| 统一 Dashboard   | `/dashboard`            | 用户总览：消费支出 + Provider 收入 + Agent 数 + 评分；最近订单 + 我的 Agent  | Dev B |
| 统一订单           | `/dashboard/orders`     | 合并订单表：Initiated（我发起的调用）+ Received（我的 Agent 被调用），Type 列区分 | Dev B |
| 支付凭证           | `/dashboard/receipts`   | 链上支付凭证列表（x402 交易记录）                                      | Dev B |
| Agent 列表       | `/dashboard/agents`     | 我的 Agent 列表，按状态筛选                                        | Dev A |
| 新建 Agent       | `/dashboard/agents/new` | 提交 Agent 表单（→ pending_review）                            | Dev A |
| Agent 详情       | `/dashboard/agents/[id]`| Agent 配置详情 + 链上身份信息                                      | Dev A |
| 评分             | `/dashboard/ratings`    | 评分分布 + 评论列表，含链上验证信息                                      | Dev A |
| Admin 登录       | `/admin/login`          | 管理员账号密码登录                                                | Dev B |
| Admin Dashboard| `/admin/dashboard`      | 平台统计总览：Agent 数 / 待审核 / 订单量 / 收入 / 钱包数；最近提交 + 失败收据      | Dev B |
| Admin Agent Review | `/admin/agents`     | Agent 审核列表：状态筛选 + 审批（Approve / Reject / Suspend）          | Dev B |
| Admin Failed Receipts | `/admin/receipts` | 上链失败收据列表：错误信息 + 重试次数 + 手动 Retry                         | Dev B |
| Admin Users    | `/admin/users`          | 钱包列表：Agent 数 / 订单数 / 消费 / 收入（不区分角色，聚合展示）               | Dev B |


---

## 二、未登录首页 (`/`)

### 2.1 页面区块与接口映射


| 区块              | 功能描述                                              | 依赖接口                                        | 渲染方式        |
| --------------- | ------------------------------------------------- | ------------------------------------------- | ----------- |
| 导航栏             | Logo + 导航链接 + Connect Wallet / Become Provider 按钮 | 无                                           | 静态          |
| Hero 区          | 价值主张标题 + 副标题 + 搜索框（Match Agent）                   | `POST /v1/public/match`（搜索触发时）              | 静态 + 客户端交互  |
| 平台统计            | Agent 总数 / Provider 数 / 订单量 / 平均评分                | `GET /v1/public/market/stats`               | SSR         |
| 分类标签            | Security / DeFi / Data / Code Audit 等             | 无（静态标签，点击跳转 Marketplace）                    | 静态          |
| Featured Agents | 精选 Agent 卡片 (2×2)                                 | `GET /v1/public/market/agents`              | SSR         |
| Agent 链上标识（不要）  | 卡片上的 Verified badge + 链上地址                        | `GET /v1/public/market/agents/:id/on-chain` | SSR / 客户端补充 |
| 信任流程图           | 5 步流程展示（提交→审核→注册→支付→反馈）（缺少cli的注册创建）               | 无                                           | 静态          |
| Footer          | 平台链接 + 外部链接                                       | 无                                           | 静态          |


### 2.2 接口详情

#### `GET /v1/public/market/stats`

平台统计概览数据，首页 Stats 区块使用。

```
Request:
  GET /v1/public/market/stats

Response 200:
{
  "total_agents": 1284,        // 已注册 Agent 总数
  "total_providers": 913,      // Provider 总数
  "total_orders": 72400,       // 累计订单量
  "avg_rating": 4.84,          // 全局平均评分
  "total_spending_usdc": 156000 // 累计交易额 (USDC)
}
```

- **调用时机**: 页面 SSR 渲染时
- **缓存策略**: ISR (Incremental Static Regeneration)，建议 revalidate = 300s (5分钟)
- **错误处理**: 降级显示 "—" 占位符

---

#### `GET /v1/public/market/agents`

Agent 列表，首页 Featured Agents 区块使用。

```
Request:
  GET /v1/public/market/agents?sort=rating&order=desc&limit=4&status=active

Query Parameters:
  - sort: string     — 排序字段 (rating | price | newest | calls)
  - order: string    — 排序方向 (asc | desc)
  - limit: number    — 返回数量，首页固定为 4
  - status: string   — Agent 状态 (active)
  - tags: string     — 分类筛选，逗号分隔 (security,defi)

Response 200:
{
  "agents": [
    {
      "id": "uuid",
      "name": "Contract Sentinel",
      "description": "Automated security scanning...",
      "endpoint": "https://agent.example.com/execute",
      "price_usdc": 1.8,
      "tags": ["security", "solana"],
      "provider_wallet": "8Hk3...xF9a",
      "provider_name": "AuditLabs",
      "avg_rating": 4.9,
      "rating_count": 312,
      "total_calls": 2100,
      "status": "active",
      "chain_status": "registered",
      "sol_asset_address": "8Hk3nVf...xF9aPq",
      "ipfs_cid": "QmX7k9..."
    }
  ],
  "total": 1284,
  "page": 1,
  "limit": 4
}
```

- **调用时机**: 页面 SSR 渲染时
- **首页参数**: `sort=rating&order=desc&limit=4&status=active`
- **缓存策略**: ISR, revalidate = 300s

---

#### `GET /v1/public/market/agents/:id/on-chain`

Agent 链上身份与声誉信息，用于卡片上的 Verified badge 及链上地址展示。

```
Request:
  GET /v1/public/market/agents/:id/on-chain

Response 200:
{
  "agent_id": "uuid",
  "sol_asset_address": "8Hk3nVf...xF9aPq",
  "ipfs_metadata_uri": "ipfs://QmX7k9...",
  "chain_status": "registered",
  "creator": "PlatformWallet...pubkey",
  "owner": "ProviderWallet...pubkey",
  "reputation": {
    "total_feedbacks": 128,
    "avg_score": 84,
    "transaction_count": 95,
    "rating_count": 33
  },
  "liveness": "live"          // live | partial | not_live
}
```

- **调用时机**: SSR 批量预取 或 客户端按需加载
- **首页用法**: 遍历 featured agents，批量获取链上状态
- **注意**: 首页仅用 `chain_status` + `sol_asset_address` + `liveness`，完整数据在详情页展示

---

#### `POST /v1/public/match`

AI 语义匹配，首页搜索框 "Match Agent" 功能。

```
Request:
  POST /v1/public/match
  Content-Type: application/json

  {
    "task": "audit my Solana program for vulnerabilities",
    "max_price_usdc": 10,       // 可选，最大价格限制
    "tags": ["security"]        // 可选，偏好标签
  }

Response 200:
{
  "top": {
    "agent_id": "uuid",
    "name": "Contract Sentinel",
    "score": 0.95,
    "price_usdc": 1.8,
    "reason": "Best match for Solana smart contract security auditing with highest rating in the security category."
  },
  "alternatives": [
    {
      "agent_id": "uuid",
      "name": "Rug Detector",
      "score": 0.72,
      "price_usdc": 4.0,
      "reason": "Focuses on risk assessment which partially covers audit needs."
    }
  ],
  "reason": "Matched based on security audit capability and Solana specialization."
}
```

- **调用时机**: 用户在搜索框输入任务描述并点击 "Match Agent" 按钮时
- **渲染方式**: 客户端交互触发，结果展示为弹层或跳转详情页
- **Claude API**: 后端使用 Claude API (claude-sonnet) 做语义重排

---

#### `GET /v1/public/auth/challenge` + `POST /v1/public/auth/verify`

钱包连接认证流程，Connect Wallet 按钮触发。

```
Step 1 - 获取签名挑战:
  GET /v1/public/auth/challenge?wallet=PublicKeyBase58

  Response 200:
  {
    "challenge": "Sign this message to verify...: <nonce>",
    "expires_in": 300
  }

Step 2 - 验证签名:
  POST /v1/public/auth/verify
  Content-Type: application/json

  {
    "wallet": "PublicKeyBase58",
    "signature": "Base58EncodedSignature"
  }

  Response 200:
  {
    "token": "eyJhbG...",         // JWT
    "wallet_pubkey": "PublicKeyBase58",
    "expires_in": 86400
  }
```

- **调用时机**: 用户点击 "Connect Wallet" 按钮
- **渲染方式**: 客户端交互
- **Token 存储**: Web 端存 cookie (httpOnly)
- **登录后跳转**: 统一跳转 `/dashboard`（不区分 Consumer / Provider）

---

## 三、Marketplace 页面 (`/marketplace`)

### 3.1 页面区块与接口映射


| 区块         | 功能描述                                              | 依赖接口                                                     | 渲染方式        |
| ---------- | ------------------------------------------------- | -------------------------------------------------------- | ----------- |
| 导航栏        | 同首页                                               | 无                                                        | 静态          |
| 页面标题       | "Agent Marketplace" + 副标题                         | 无                                                        | 静态          |
| 搜索栏        | 关键词搜索 Agent                                       | `GET /v1/public/market/agents` (带 search 参数)             | 客户端交互       |
| 排序下拉       | Rating / Price / Newest / Calls                   | `GET /v1/public/market/agents` (带 sort 参数)               | 客户端交互       |
| 视图切换       | 网格视图 / 列表视图                                       | 无（纯前端状态）                                                 | 客户端         |
| 分类筛选       | All / Security / DeFi / Data / Code / NLP / Infra | `GET /v1/public/market/agents` (带 tags 参数)               | 客户端交互       |
| 价格区间       | 0 ~ 50 USDC 区间筛选                                  | `GET /v1/public/market/agents` (带 min_price / max_price) | 客户端交互       |
| Agent 卡片网格 | 3×3 完整版 Agent 卡片                                  | `GET /v1/public/market/agents`                           | SSR + 客户端分页 |
| Agent 链上标识 | 每张卡片的 Verified badge                              | `GET /v1/public/market/agents/:id/on-chain`              | 客户端补充       |
| 分页         | Prev / 1 2 3 ... N / Next                         | `GET /v1/public/market/agents` (带 page 参数)               | 客户端交互       |
| Footer     | 同首页                                               | 无                                                        | 静态          |


### 3.2 接口详情

#### `GET /v1/public/market/agents`（Marketplace 完整版）

Marketplace 页面的核心接口，支持搜索、筛选、排序、分页的完整参数。

```
Request:
  GET /v1/public/market/agents?search=security&tags=security,defi&sort=rating&order=desc&min_price=0&max_price=50&page=1&limit=9&status=active

Query Parameters:
  - search: string      — 关键词搜索（匹配 name + description）
  - tags: string         — 分类标签，逗号分隔
  - sort: string         — 排序字段 (rating | price | newest | calls)，默认 rating
  - order: string        — 排序方向 (asc | desc)，默认 desc
  - min_price: number    — 最低价格 (USDC)
  - max_price: number    — 最高价格 (USDC)
  - page: number         — 页码，从 1 开始，默认 1
  - limit: number        — 每页数量，Marketplace 固定为 9
  - status: string       — Agent 状态 (active)

Response 200:
{
  "agents": [
    {
      "id": "uuid",
      "name": "Contract Sentinel",
      "description": "Automated security scanning...",
      "endpoint": "https://agent.example.com/execute",
      "price_usdc": 1.8,
      "tags": ["security", "solana"],
      "provider_wallet": "8Hk3...xF9a",
      "provider_name": "AuditLabs",
      "avg_rating": 4.9,
      "rating_count": 312,
      "total_calls": 2100,
      "status": "active",
      "chain_status": "registered",
      "sol_asset_address": "8Hk3nVf...xF9aPq",
      "ipfs_cid": "QmX7k9...",
      "liveness": "live",
      "created_at": "2026-04-01T00:00:00Z"
    }
    // ... 最多 9 条
  ],
  "total": 1284,
  "page": 1,
  "limit": 9,
  "total_pages": 143
}
```

- **首次加载**: SSR，默认 `sort=rating&order=desc&page=1&limit=9&status=active`
- **交互更新**: 客户端切换筛选/排序/分页时，通过 SWR / React Query 请求
- **URL 同步**: 筛选状态同步到 URL query params，支持浏览器前进/后退和分享
- **缓存策略**: 首次 SSR (revalidate=60s)，客户端请求 stale-while-revalidate

---

#### `GET /v1/public/market/agents/:id/on-chain`（批量）

同首页接口，Marketplace 页面按需为可见卡片加载链上信息。

- **调用策略**: 页面渲染后，客户端批量请求当前页 9 个 Agent 的链上状态
- **优化建议**: 后续可考虑 batch endpoint `POST /v1/public/market/agents/batch-on-chain`
- **降级处理**: 链上接口超时时，隐藏 Verified badge，不阻塞卡片渲染

---

#### `GET /v1/public/market/agents/:id/feedbacks`

Agent 评价列表，Marketplace 卡片不直接使用，但点击进入详情页时需要。

```
Request:
  GET /v1/public/market/agents/:id/feedbacks?page=1&limit=10

Response 200:
{
  "feedbacks": [
    {
      "id": "uuid",
      "tag1": "transaction",      // transaction | starred
      "tag2": "completed",        // completed | user_rating
      "value": 100,               // 0-100
      "ipfs_cid": "QmFeedback...",
      "tx_signature": "5xK9...",
      "created_at": "2026-04-15T12:00:00Z"
    }
  ],
  "total": 128,
  "page": 1,
  "limit": 10
}
```

- **调用时机**: 用户从 Marketplace 点击卡片进入 Agent 详情页时
- **渲染方式**: 客户端请求

---

## 四、接口交互流程图

### 4.1 首页加载流程

```
浏览器请求 GET /
  │
  ├─ SSR 并行请求:
  │   ├── GET /v1/public/market/stats          → Stats 区块数据
  │   └── GET /v1/public/market/agents?limit=4 → Featured Agents 数据
  │
  ├─ 客户端 Hydration 后:
  │   └── GET /v1/public/market/agents/:id/on-chain (×4)  → Agent 链上 badge
  │
  └─ 用户交互:
      ├── [点击 Match Agent]  → POST /v1/public/match
      ├── [点击 Connect Wallet] → GET /v1/public/auth/challenge
      │                          → POST /v1/public/auth/verify
      └── [点击 Featured Agent] → 跳转 /marketplace/:id (Agent 详情页)
```

### 4.2 Marketplace 加载流程

```
浏览器请求 GET /marketplace
  │
  ├─ SSR 请求:
  │   └── GET /v1/public/market/agents?sort=rating&order=desc&page=1&limit=9
  │
  ├─ 客户端 Hydration 后:
  │   └── GET /v1/public/market/agents/:id/on-chain (×9)  → Agent 链上 badge
  │
  └─ 用户交互:
      ├── [搜索] → GET /v1/public/market/agents?search=xxx&page=1&limit=9
      ├── [切换分类] → GET /v1/public/market/agents?tags=security&page=1&limit=9
      ├── [调整价格] → GET /v1/public/market/agents?min_price=0&max_price=10&page=1&limit=9
      ├── [切换排序] → GET /v1/public/market/agents?sort=price&order=asc&page=1&limit=9
      ├── [翻页] → GET /v1/public/market/agents?page=2&limit=9
      ├── [点击卡片] → 跳转 /marketplace/:id
      │                 ├── GET /v1/public/market/agents/:id
      │                 ├── GET /v1/public/market/agents/:id/on-chain
      │                 └── GET /v1/public/market/agents/:id/feedbacks
      └── [Connect Wallet] → 同首页认证流程
```

---

## 五、接口汇总表


| 接口                                       | 方法   | 认证  | 页面                    | 用途                     |
| ---------------------------------------- | ---- | --- | --------------------- | ---------------------- |
| `/v1/public/market/stats`                | GET  | 无   | 首页                    | 平台统计数据                 |
| `/v1/public/market/agents`               | GET  | 无   | 首页 + Marketplace      | Agent 列表（含搜索/筛选/排序/分页） |
| `/v1/public/market/agents/:id`           | GET  | 无   | Agent 详情页             | Agent 完整信息             |
| `/v1/public/market/agents/:id/on-chain`  | GET  | 无   | 首页 + Marketplace + 详情 | 链上身份与声誉                |
| `/v1/public/market/agents/:id/feedbacks` | GET  | 无   | Agent 详情页             | 链上 Feedback 列表         |
| `/v1/public/match`                       | POST | 无   | 首页                    | AI 语义匹配 Agent          |
| `/v1/public/auth/challenge`              | GET  | 无   | 首页 + Marketplace      | 获取钱包签名挑战               |
| `/v1/public/auth/verify`                 | POST | 无   | 首页 + Marketplace      | 验证钱包签名，返回 JWT          |


---

## 六、前端实现建议

### 6.1 数据获取策略


| 场景                | 策略                    | 工具                              |
| ----------------- | --------------------- | ------------------------------- |
| 首页 Stats          | ISR (revalidate=300s) | Next.js `fetch` + `revalidate`  |
| 首页 Featured       | ISR (revalidate=300s) | Next.js `fetch` + `revalidate`  |
| Marketplace 首次加载  | SSR                   | Next.js Server Component        |
| Marketplace 筛选/翻页 | CSR + SWR             | `swr` 或 `@tanstack/react-query` |
| 链上状态              | CSR 批量请求              | `Promise.all` + `swr`           |
| Match 搜索          | CSR 按需请求              | `fetch` + loading state         |


### 6.2 URL 状态同步 (Marketplace)

Marketplace 筛选状态同步到 URL，支持分享和浏览器导航：

```
/marketplace?tags=security&sort=rating&order=desc&min_price=0&max_price=10&page=2
```

使用 `next/navigation` 的 `useSearchParams` + `useRouter` 管理。

### 6.3 错误处理


| 接口失败        | 降级方案                    |
| ----------- | ----------------------- |
| stats 接口    | 显示 "—" 占位符              |
| agents 列表   | 显示 "暂无数据" + 重试按钮        |
| on-chain 接口 | 隐藏 Verified badge，不阻塞卡片 |
| match 接口    | Toast 提示 "匹配失败，请重试"     |
| auth 接口     | Toast 提示 "连接失败" + 引导重试  |


---

## 七、钱包登录 Modal（全局组件）

### 7.1 交互流程与接口映射


| 步骤 | 用户操作 | 依赖接口 | 说明 |
|------|---------|---------|------|
| 1. 打开 Modal | 点击 Connect Wallet | 无 | 展示 Phantom / Solflare / Backpack |
| 2. 选择钱包 | 点击钱包选项 | 浏览器 Wallet Adapter | 调用 `window.solana` 或对应钱包 SDK |
| 3. 获取 Challenge | 钱包连接成功 | `GET /v1/public/auth/challenge?wallet={pubkey}` | 获取签名 nonce |
| 4. 签名 | 钱包弹窗确认 | 浏览器 Wallet Adapter `signMessage()` | 用户在钱包中确认签名 |
| 5. 验证登录 | 自动 | `POST /v1/public/auth/verify` | 提交签名，获取 JWT |
| 6. 身份推断 | 自动 | `GET /v1/provider/agents` (带 JWT) | 判断是否为 Provider（有 Agent 记录）|
| 7. 导航更新 | 自动 | 无 | 替换 Connect Wallet 为头像+地址，下拉菜单可用 |


### 7.2 接口详情

#### `GET /v1/public/auth/challenge`

```
Request:
  GET /v1/public/auth/challenge?wallet=PublicKeyBase58

Response 200:
{
  "nonce": "random-uuid-string",
  "message": "Sign this message to verify your identity on AgentHub:\n\nNonce: random-uuid-string",
  "expires_at": "2026-04-20T12:05:00Z"
}
```

#### `POST /v1/public/auth/verify`

```
Request:
  POST /v1/public/auth/verify
  Content-Type: application/json

  {
    "wallet": "PublicKeyBase58",
    "signature": "Base58EncodedSignature"
  }

Response 200:
{
  "token": "eyJhbG...",
  "wallet_pubkey": "PublicKeyBase58",
  "expires_in": 86400
}
```

### 7.3 登录后导航状态

登录后导航栏右侧变化：
- `Connect Wallet` → **Gradient Avatar**（基于 pubkey 哈希生成渐变色）+ **地址缩写**（0x7F...3e2d）
- 点击展开下拉菜单：
  - 钱包信息（头像 + 地址 + "Solana Devnet"）
  - 分隔线
  - Dashboard（layout-dashboard 图标）
  - My Agents（bot 图标）
  - Orders（receipt 图标）
  - Ratings（star 图标）
  - 分隔线
  - Disconnect（log-out 图标，红色）
- **不区分 Consumer / Provider**：所有菜单项对所有用户可见

### 7.4 ah:dashboard CLI 跳转流程

CLI 插件通过 `/agenthub:dashboard` 命令打开 Web Dashboard：

```
CLI 执行 /agenthub:dashboard
  │
  ├─ 生成临时 JWT（含 client: "cli" 标记）
  ├─ 打开浏览器: GET /dashboard?token=eyJhbG...
  │
  └─ Web 端处理:
      ├── 读取 URL query token
      ├── 验证 JWT 有效性
      ├── 写入 httpOnly cookie
      ├── 清除 URL 中的 token 参数
      └── 渲染 /dashboard 页面
```

---

## 八、统一 Dashboard (`/dashboard`)

> **核心变更**: 不再区分 Consumer Dashboard / Provider Dashboard，合并为统一 Dashboard。
> 同一钱包既可以是 Consumer（发起 Agent 调用）也可以是 Provider（提供 Agent 服务）。

### 8.1 页面区块与接口映射


| 区块 | 功能描述 | 依赖接口 | 渲染方式 |
|------|---------|---------|---------|
| 顶部导航 | Logo + 分隔线 + Back to Marketplace + 头像 + 地址 | 无 | 静态 |
| 统一侧边栏 | MY ACCOUNT: Overview / Orders / Receipts + 分隔线 + PROVIDER: My Agents / New Agent / Ratings | 无 | 静态 |
| 统计卡片（4 张）| Spending（消费支出）/ Revenue（Provider 收入）/ My Agents / Avg. Rating | `GET /v1/user/dashboard` | SSR |
| Recent Orders 面板 | 最近混合订单（Initiated + Received），带 Type 图标区分 | `GET /v1/user/orders?limit=5&sort=created_at&order=desc` | SSR |
| My Agents 面板 | Agent 名称 + 订单数 + 评分 + 状态 badge | `GET /v1/provider/agents?limit=4` | SSR |


### 8.2 统一侧边栏结构

```
┌─────────────────────┐
│ MY ACCOUNT          │  ← 区块标签 (灰色, 10px, 大写)
│                     │
│ ● Overview          │  ← 当前页高亮 (#EEF2FF bg, #6366F1 text)
│   Orders            │
│   Receipts          │
│                     │
│ ─────────────────── │  ← 分隔线
│                     │
│ PROVIDER            │  ← 区块标签
│                     │
│   My Agents         │
│   New Agent         │
│   Ratings           │
└─────────────────────┘
```

- 所有页面共享此侧边栏，仅当前页面对应菜单项高亮
- 不根据身份隐藏菜单项，所有用户可见全部菜单

### 8.3 接口详情

#### `GET /v1/user/dashboard`（新接口）

统一 Dashboard 报表数据，合并 Consumer 消费 + Provider 收入。

```
Request:
  GET /v1/user/dashboard
  Authorization: Bearer {jwt}

Response 200:
{
  "spending": {
    "total_usdc_micro": 842000000,
    "total_calls": 156,
    "this_month_usdc_micro": 210000000,
    "this_month_calls": 42
  },
  "revenue": {
    "total_usdc_micro": 3118000000,
    "total_orders": 1247,
    "this_month_usdc_micro": 891000000,
    "this_month_orders": 312,
    "growth_pct": 24
  },
  "agents": {
    "total": 8,
    "active": 5,
    "pending": 2,
    "rejected": 1
  },
  "rating": {
    "average": 4.72,
    "total_reviews": 89
  }
}
```

- **调用时机**: 页面 SSR 渲染时
- **注意**: 如果用户没有 Provider 记录，`revenue` 和 `agents` 和 `rating` 字段返回零值（不报错）
- **注意**: 如果用户没有 Consumer 记录，`spending` 字段返回零值

#### `GET /v1/provider/agents`（Dashboard 用法）

```
Request:
  GET /v1/provider/agents?limit=4
  Authorization: Bearer {jwt}

Response 200:
{
  "agents": [
    {
      "id": "cuid",
      "name": "Contract Sentinel",
      "status": "active",
      "chain_status": "registered",
      "sol_asset_address": "7xKp...D3nF",
      "price_usdc_micro": 2500000,
      "rating_avg": 4.9,
      "rating_count": 89,
      "total_orders": 423,
      "capability_tags": ["security", "audit", "solana"],
      "created_at": "2026-03-15T14:22:00Z"
    }
  ],
  "total": 8
}
```

#### `GET /v1/user/orders`（新接口，Dashboard 用法）

```
Request:
  GET /v1/user/orders?limit=5&sort=created_at&order=desc
  Authorization: Bearer {jwt}

Response 200:
{
  "orders": [
    {
      "id": "cuid",
      "type": "initiated",
      "agent_id": "cuid",
      "agent_name": "Contract Sentinel",
      "counterparty_wallet": "0xA3b...8f21",
      "amount_usdc_micro": 2500000,
      "status": "completed",
      "payment_verified": true,
      "payment_tx": "4vBm...9pQr",
      "created_at": "2026-04-20T10:30:00Z"
    },
    {
      "id": "cuid",
      "type": "received",
      "agent_id": "cuid",
      "agent_name": "Revenue Analyzer",
      "counterparty_wallet": "0x5D1...c4e7",
      "amount_usdc_micro": 1800000,
      "status": "completed",
      "payment_verified": true,
      "payment_tx": "5xK9...2mQr",
      "created_at": "2026-04-20T10:15:00Z"
    }
  ],
  "total": 1403,
  "page": 1,
  "limit": 5
}
```

- **`type` 字段**: `"initiated"` = 我作为 Consumer 发起的调用，`"received"` = 我的 Agent 被别人调用
- **`counterparty_wallet`**: initiated 时为 Agent 的 Provider 钱包，received 时为 Consumer 钱包

---

## 九、Agent 列表 (`/dashboard/agents`)

### 9.1 页面区块与接口映射


| 区块 | 功能描述 | 依赖接口 | 渲染方式 |
|------|---------|---------|---------|
| 搜索框 | 按 Agent 名称搜索 | `GET /v1/provider/agents?search=xxx` | 客户端交互 |
| 状态筛选 | All / Active / Pending / Rejected | `GET /v1/provider/agents?status=xxx` | 客户端交互 |
| Agent 卡片列表 | 名称、描述、标签、价格、评分、订单数、状态 badge、链上标识 | `GET /v1/provider/agents` | SSR + 客户端筛选 |
| 操作按钮 | Edit / View / Resubmit（按状态显示）| 无（导航跳转）| 静态 |
| New Agent 按钮 | 跳转到新建表单 | 无 | 静态 |
| 统一侧边栏 | My Agents 高亮 | 无 | 静态 |


---

## 十、新建 Agent (`/dashboard/agents/new`)

> **核心要求**: Agent 是 Provider 自建的 x402 服务端。平台仅托管注册信息，不代理支付。
> Consumer 通过 CLI 本地签名直接向 Agent endpoint 付费调用。

### 10.1 表单区块与字段

表单分为 4 个区块，顶部有 x402 合规提醒 Banner：

**x402 Info Banner**: 蓝色信息横幅，提醒 Provider 其 endpoint 必须实现 x402 支付协议。

#### 区块一：Basic Information

| 字段 | 类型 | 必填 | 对应 API 字段 | 说明 |
|------|------|------|-------------|------|
| Agent Name | text | 是 | `name` | Agent 名称 |
| Description | textarea | 是 | `description` | Agent 功能描述，用于 Marketplace 展示 + AI 匹配 |
| Capability Tags | tag input | 是 | `capability_tags` | 用户自定义标签，最多 5 个，用于搜索筛选 |

#### 区块二：x402 Endpoint Configuration

| 字段 | 类型 | 必填 | 对应 API 字段 | 说明 |
|------|------|------|-------------|------|
| Endpoint URL | text | 是 | `endpoint_url` | x402 服务端地址。Helper: "Must respond with HTTP 402 when no X-PAYMENT header" |
| Price per Call (USDC) | number | 是 | `price_usdc_micro` | 前端输入 USDC，后端转 micro（×1000000）。Helper: "Must match your endpoint's 402 response amount" |

> **payTo 地址**: 默认使用 Provider 的登录钱包地址，不单独填写。

#### 区块三：ERC-8004 On-Chain Classification

| 字段 | 类型 | 必填 | 对应 API 字段 | 说明 |
|------|------|------|-------------|------|
| Skills | multi-select | 是 | `skills` | ERC-8004 标准分类，如 `natural_language_processing/code_review` |
| Domains | multi-select | 是 | `domains` | ERC-8004 标准分类，如 `technology/software_engineering` |

> 用于 Admin 审批通过后构建 ERC-8004 Registration File 并上链注册。

#### 区块四：API Schema (Optional)

| 字段 | 类型 | 必填 | 对应 API 字段 | 说明 |
|------|------|------|-------------|------|
| Input Schema | json editor | 否 | `input_schema` | JSON Schema 定义 Agent 接受的输入格式 |
| Output Format | json editor | 否 | `output_format` | JSON Schema 定义 Agent 返回的输出格式 |

#### 已删除字段

| 字段 | 原因 |
|------|------|
| ~~AI Model~~ | Agent 内部实现细节，Consumer 不需要知道 |
| ~~Agent Image URL~~ | Marketplace 使用默认图标，简化表单 |

### 10.2 接口详情

#### `POST /v1/provider/agents`

```
Request:
  POST /v1/provider/agents
  Authorization: Bearer {jwt}
  Content-Type: application/json

  {
    "name": "Contract Sentinel",
    "description": "Automated smart contract security analysis with real-time vulnerability detection for Solana programs.",
    "endpoint_url": "https://agent.certiklabs.com/sentinel/v2",
    "price_usdc_micro": 2500000,
    "capability_tags": ["security", "audit", "solana"],
    "skills": ["natural_language_processing/code_review", "security/vulnerability_scan"],
    "domains": ["technology/software_engineering", "finance/defi"],
    "input_schema": { "type": "object", "properties": { "task": { "type": "string" } } },
    "output_format": { "type": "object", "properties": { "result": { "type": "string" } } }
  }

Response 201:
{
  "id": "cuid",
  "name": "Contract Sentinel",
  "status": "pending_review",
  "created_at": "2026-04-20T12:00:00Z"
}
```

- **提交后状态**: `pending_review` → 等待 Admin 审批
- **成功反馈**: Toast "Agent submitted successfully. Awaiting admin review." + 跳转到 Agent 列表
- **x402 验证**: Admin 审核时可测试调用 endpoint 确认 402 响应正确

---

## 十一、Agent 详情 (`/dashboard/agents/[id]`)

### 11.1 页面区块与接口映射


| 区块 | 功能描述 | 依赖接口 | 渲染方式 |
|------|---------|---------|---------|
| 面包屑 | My Agents > Agent Name | 无 | 静态 |
| Agent 头部 | 名称 + 状态 badge + 链上标识 + 描述 + 标签 | `GET /v1/provider/agents/:id` | SSR |
| 统计卡片（4 张）| Price / Total Orders / Avg. Rating / Avg. Response | `GET /v1/provider/agents/:id` | SSR |
| Agent Configuration | Endpoint URL / Price per Call / 创建时间 / 更新时间 | `GET /v1/provider/agents/:id` | SSR |
| ERC-8004 Classification | Skills（紫色 pills）/ Domains（绿色 pills）| `GET /v1/provider/agents/:id` | SSR |
| On-Chain Identity | Asset Address / IPFS CID / Register TX / Chain Status / Registered At | `GET /v1/public/market/agents/:id/on-chain` | SSR |
| Edit Agent 按钮 | 跳转编辑或展开编辑模式 | `PATCH /v1/provider/agents/:id`（保存时）| 客户端交互 |


### 11.2 接口详情

#### `GET /v1/provider/agents/:id`

```
Request:
  GET /v1/provider/agents/:id
  Authorization: Bearer {jwt}

Response 200:
{
  "id": "cuid",
  "name": "Contract Sentinel",
  "description": "Automated smart contract security analysis...",
  "endpoint_url": "https://agent.certiklabs.com/sentinel/v2",
  "price_usdc_micro": 2500000,
  "capability_tags": ["security", "audit", "solana"],
  "skills": ["natural_language_processing/code_review", "security/vulnerability_scan"],
  "domains": ["technology/software_engineering", "finance/defi"],
  "status": "active",
  "review_note": null,
  "chain_status": "registered",
  "sol_asset_address": "7xKp...D3nF",
  "ipfs_cid": "Qm3x...8kVn",
  "ipfs_uri": "ipfs://Qm3x...8kVn",
  "sol_publish_tx": "4vBm...9pQr",
  "registered_at": "2026-03-16T10:15:00Z",
  "rating_avg": 4.9,
  "rating_count": 89,
  "total_orders": 423,
  "avg_response_time_ms": 1200,
  "created_at": "2026-03-15T14:22:00Z",
  "updated_at": "2026-04-18T09:41:00Z"
}
```

#### `PATCH /v1/provider/agents/:id`

```
Request:
  PATCH /v1/provider/agents/:id
  Authorization: Bearer {jwt}
  Content-Type: application/json

  {
    "description": "Updated description...",
    "endpoint_url": "https://new-endpoint.com/api",
    "price_usdc_micro": 3000000,
    "capability_tags": ["security", "audit"],
    "skills": ["natural_language_processing/code_review", "security/vulnerability_scan"],
    "domains": ["technology/software_engineering", "finance/defi"]
  }

Response 200:
{
  "id": "cuid",
  "name": "Contract Sentinel",
  "status": "active",
  "updated_at": "2026-04-20T12:30:00Z"
}
```

- **可编辑字段**: `description`, `endpoint_url`, `price_usdc_micro`, `capability_tags`, `skills`, `domains`, `input_schema`, `output_format`
- **不可编辑字段**: `name`（需联系 Admin）
- **注意**: 编辑 active Agent 不会改变状态（依然 active），但若修改了 `endpoint_url`，Admin 可选择触发重新审核

---

## 十二、统一订单页 (`/dashboard/orders`)

> **核心变更**: 合并原 "My Orders"（Consumer 发起）和 "Agent Orders"（Provider 收到）为单表，通过 Type 列区分。

### 12.1 页面区块与接口映射


| 区块 | 功能描述 | 依赖接口 | 渲染方式 |
|------|---------|---------|---------|
| 搜索框 | 按 Order ID / Agent / 对方钱包 搜索 | `GET /v1/user/orders?search=xxx` | 客户端交互 |
| 类型筛选 | All Types / Initiated / Received | `GET /v1/user/orders?type=xxx` | 客户端交互 |
| 状态筛选 | All Status / Completed / Failed / Pending | `GET /v1/user/orders?status=xxx` | 客户端交互 |
| Agent 筛选 | 按 Agent 过滤 | `GET /v1/user/orders?agent_id=xxx` | 客户端交互 |
| 订单表格 | Order ID / **Type** / Agent / Counterparty / Amount / Status / Payment / Time | `GET /v1/user/orders` | SSR + 客户端分页 |
| 分页 | Prev / 1 2 3 ... N / Next | `GET /v1/user/orders?page=xxx` | 客户端交互 |
| Export 按钮 | 导出 CSV | `GET /v1/user/orders?format=csv` | 客户端下载 |
| 统一侧边栏 | Orders 高亮 | 无 | 静态 |


### 12.2 Type 列视觉规范

| Type | Badge 颜色 | 图标 | 金额颜色 | 含义 |
|------|-----------|------|---------|------|
| Initiated | 紫色 (#EEF2FF bg / #6366F1 text) | arrow-up-right | 红色 (-2.5 USDC) | 我发起的 Agent 调用，作为 Consumer 支出 |
| Received | 绿色 (#F0FDF4 bg / #10B981 text) | arrow-down-left | 绿色 (+1.8 USDC) | 我的 Agent 被调用，作为 Provider 收入 |

### 12.3 接口详情

#### `GET /v1/user/orders`（完整版，新接口）

```
Request:
  GET /v1/user/orders?search=&type=&status=&agent_id=&sort=created_at&order=desc&page=1&limit=20
  Authorization: Bearer {jwt}

Query Parameters:
  - search: string      — 搜索 Order ID / Agent 名称 / 对方钱包
  - type: string         — 类型筛选 (initiated | received)，不传返回全部
  - status: string       — 状态筛选 (completed | failed | pending)
  - agent_id: string     — 按 Agent 过滤
  - sort: string         — 排序字段 (created_at | amount)，默认 created_at
  - order: string        — 排序方向 (asc | desc)，默认 desc
  - page: number         — 页码，从 1 开始
  - limit: number        — 每页数量，默认 20
  - format: string       — 可选 "csv"，返回 CSV 文件

Response 200:
{
  "orders": [
    {
      "id": "cuid",
      "type": "received",
      "agent_id": "cuid",
      "agent_name": "Contract Sentinel",
      "counterparty_wallet": "0xA3b...8f21",
      "amount_usdc_micro": 2500000,
      "status": "completed",
      "payment_verified": true,
      "payment_tx": "4vBm...9pQr",
      "payment_network": "solana:devnet",
      "response_time_ms": 1200,
      "error_code": null,
      "created_at": "2026-04-20T10:30:00Z"
    },
    {
      "id": "cuid",
      "type": "initiated",
      "agent_id": "cuid",
      "agent_name": "Revenue Analyzer",
      "counterparty_wallet": "0x7F1...3e2d",
      "amount_usdc_micro": 1800000,
      "status": "completed",
      "payment_verified": true,
      "payment_tx": "5xK9...2mQr",
      "payment_network": "solana:devnet",
      "response_time_ms": 800,
      "error_code": null,
      "created_at": "2026-04-20T10:15:00Z"
    }
  ],
  "total": 1403,
  "page": 1,
  "limit": 20
}
```

- **`type` 字段**: `"initiated"` = 我作为 Consumer 发起的调用; `"received"` = 我的 Agent 被别人调用
- **`counterparty_wallet`**: initiated 时为 Provider 钱包; received 时为 Consumer 钱包
- **后端实现**: JOIN consumer_orders + provider_orders，按 wallet_pubkey 双向查询

---

## 十三、评分页 (`/dashboard/ratings`)

### 13.1 页面区块与接口映射


| 区块 | 功能描述 | 依赖接口 | 渲染方式 |
|------|---------|---------|---------|
| 总评分卡片 | 整体评分 + 星级 + 总评论数 + 链上验证标记 | `GET /v1/user/dashboard`（取 rating 字段）| SSR |
| 评分分布 | 1-5 星柱状图 | `GET /v1/provider/ratings/distribution` | SSR |
| Agent 筛选 | 按 Agent 过滤评论 | `GET /v1/provider/ratings?agent_id=xxx` | 客户端交互 |
| 评论列表 | Consumer 地址 + Agent 名称 + 星级 + 评论内容 + 链上 TX | `GET /v1/provider/ratings` | SSR + 客户端分页 |


### 13.2 接口详情

#### `GET /v1/provider/ratings`

```
Request:
  GET /v1/provider/ratings?agent_id=&sort=created_at&order=desc&page=1&limit=20
  Authorization: Bearer {jwt}

Response 200:
{
  "ratings": [
    {
      "id": "cuid",
      "agent_id": "cuid",
      "agent_name": "Contract Sentinel",
      "consumer_wallet": "0xA3b...8f21",
      "score": 5,
      "comment": "Excellent vulnerability detection...",
      "feedback_status": "submitted",
      "feedback_tx": "3kPm...7vQn",
      "feedback_ipfs_cid": "QmXx...4yZk",
      "created_at": "2026-04-20T08:15:00Z"
    }
  ],
  "total": 89,
  "page": 1,
  "limit": 20
}
```

#### `GET /v1/provider/ratings/distribution`

```
Request:
  GET /v1/provider/ratings/distribution
  Authorization: Bearer {jwt}

Response 200:
{
  "distribution": {
    "5": 52,
    "4": 24,
    "3": 8,
    "2": 3,
    "1": 2
  },
  "total": 89,
  "average": 4.72
}
```

---

## 十三-B、支付凭证页 (`/dashboard/receipts`)

### 13B.1 页面区块与接口映射


| 区块 | 功能描述 | 依赖接口 | 渲染方式 |
|------|---------|---------|---------|
| 搜索框 | 按 TX Hash / Agent 搜索 | `GET /v1/user/receipts?search=xxx` | 客户端交互 |
| 类型筛选 | All / Payment / Received | `GET /v1/user/receipts?type=xxx` | 客户端交互 |
| 凭证表格 | TX Hash / Type / Agent / Amount / Network / Status / Time | `GET /v1/user/receipts` | SSR + 客户端分页 |
| 分页 | 同订单页 | `GET /v1/user/receipts?page=xxx` | 客户端交互 |
| 统一侧边栏 | Receipts 高亮 | 无 | 静态 |


### 13B.2 接口详情

#### `GET /v1/user/receipts`

```
Request:
  GET /v1/user/receipts?type=&search=&sort=created_at&order=desc&page=1&limit=20
  Authorization: Bearer {jwt}

Query Parameters:
  - type: string       — 筛选 (payment | received)，不传返回全部
  - search: string     — 搜索 TX Hash / Agent 名称
  - page: number       — 页码
  - limit: number      — 每页数量

Response 200:
{
  "receipts": [
    {
      "id": "cuid",
      "type": "payment",
      "order_id": "cuid",
      "agent_name": "Contract Sentinel",
      "amount_usdc_micro": 2500000,
      "payment_tx": "4vBm...9pQr",
      "payment_network": "solana:devnet",
      "x402_protocol_version": "1.0",
      "status": "verified",
      "created_at": "2026-04-20T10:30:00Z"
    }
  ],
  "total": 312,
  "page": 1,
  "limit": 20
}
```

- **`type`**: `"payment"` = 我支付给 Agent 的凭证; `"received"` = 别人调用我的 Agent 支付的凭证
- **与 Orders 页面的区别**: Receipts 聚焦链上支付交易（TX Hash、Network、x402 协议），Orders 聚焦业务层（Status、Agent、Response Time）

---

## 十四、Admin 登录页 (`/admin/login`)

### 14.1 页面区块与接口映射

| 区块 | 功能描述 | 依赖接口 | 渲染方式 |
|------|---------|---------|---------|
| 导航栏 | Logo + "Admin" 标识 | 无 | 静态 |
| 登录卡片 | 居中表单：Username / Password + Sign In 按钮 | `POST /v1/admin/auth/login` | 客户端交互 |
| 底部提示 | "Protected by session-based authentication" | 无 | 静态 |

### 14.2 接口详情

#### `POST /v1/admin/auth/login`

Admin 账号密码登录，获取 Session JWT。

```
Request:
  POST /v1/admin/auth/login
  Content-Type: application/json

  {
    "username": "admin",
    "password": "••••••••"
  }

Response 200:
{
  "token": "eyJhbG...",
  "admin_id": "cuid",
  "username": "admin",
  "expires_in": 86400
}

Response 401:
{
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid username or password"
}
```

- **调用时机**: 用户点击 Sign In 按钮
- **Token 存储**: cookie (httpOnly, secure, sameSite=strict)
- **登录后跳转**: `/admin/dashboard`
- **认证方式**: bcrypt hash 验证，与钱包签名完全独立

---

## 十五、Admin Dashboard (`/admin/dashboard`)

### 15.1 页面区块与接口映射

| 区块 | 功能描述 | 依赖接口 | 渲染方式 |
|------|---------|---------|---------|
| 导航栏 | Logo + "Admin Panel" badge + 当前用户名 + 头像 | Session JWT | SSR |
| 侧边栏 | PLATFORM 分组：Dashboard(active) / Agent Review(带待审数 badge) / Users / Failed Receipts(带失败数 badge) | `GET /v1/admin/stats`（badge 计数） | SSR |
| 统计卡片行 | Total Agents / Pending Review / Total Orders / Total Revenue / Active Wallets | `GET /v1/admin/stats` | SSR |
| Recent Submissions 面板 | 最近提交的 Agent 列表（名称、Provider 钱包、时间、状态 badge） | `GET /v1/admin/agents?sort=newest&limit=5` | SSR |
| Failed Receipts 面板 | 上链失败收据列表（Receipt ID、错误描述、金额、Retry 按钮） | `GET /v1/admin/receipts/failed?limit=5` | SSR |

### 15.2 接口详情

#### `GET /v1/admin/stats`

平台级统计数据，Admin Dashboard 使用。

```
Request:
  GET /v1/admin/stats
  Auth: Admin Session

Response 200:
{
  "total_agents": 47,
  "agents_by_status": {
    "active": 38,
    "pending_review": 6,
    "rejected": 3,
    "suspended": 0
  },
  "total_orders": 1284,
  "orders_this_week": 89,
  "total_revenue_usdc": 24580,
  "revenue_this_week_usdc": 2340,
  "active_wallets": 312,
  "new_wallets_this_month": 28,
  "failed_receipts_count": 2
}
```

- **调用时机**: 页面 SSR 渲染
- **数据来源**: Agent/Order/Wallet/Receipt 表聚合查询
- **Sidebar badge**: `agents_by_status.pending_review` → Agent Review badge, `failed_receipts_count` → Failed Receipts badge

---

## 十六、Admin Agent Review (`/admin/agents`)

### 16.1 页面区块与接口映射

| 区块 | 功能描述 | 依赖接口 | 渲染方式 |
|------|---------|---------|---------|
| 导航栏 + 侧边栏 | 同 Admin Dashboard，Agent Review 高亮 | — | SSR |
| 页面标题 | "Agent Review" + 副标题说明 | 无 | 静态 |
| 状态筛选 Tab | All / Pending / Active / Rejected / Suspended（带计数） | `GET /v1/admin/agents` | 客户端交互 |
| Agent 表格 | Agent Name / Provider / Price / Tags / Status / Submitted / Actions | `GET /v1/admin/agents` | SSR + 客户端筛选 |
| 操作按钮 | Pending → Approve + Reject; Active → Suspend; Rejected → 显示 reviewNote | `POST /v1/admin/agents/:id/approve` / `reject` / `suspend` | 客户端交互 |

### 16.2 接口详情

#### `GET /v1/admin/agents`

全部 Agent 列表（含所有状态），Admin 审核使用。

```
Request:
  GET /v1/admin/agents?status=pending_review&sort=newest&page=1&limit=20
  Auth: Admin Session

Query Parameters:
  - status: string    — 可选，按状态筛选 (pending_review | active | rejected | suspended)
  - sort: string      — 排序 (newest | name | price)，默认 newest
  - page: number      — 页码
  - limit: number     — 每页数量

Response 200:
{
  "agents": [
    {
      "id": "uuid",
      "name": "Smart Contract Auditor",
      "description": "Automated security scanning...",
      "provider_wallet": "7Hk3...xF9a",
      "price_usdc": 2.50,
      "tags": ["security", "solana"],
      "skills": ["nlp/code_review"],
      "domains": ["technology/blockchain"],
      "status": "pending_review",
      "review_note": null,
      "chain_status": "none",
      "created_at": "2026-04-20T08:00:00Z"
    }
  ],
  "total": 47,
  "page": 1,
  "limit": 20
}
```

#### `POST /v1/admin/agents/:id/approve`

审批通过，触发 ERC-8004 上链流程。

```
Request:
  POST /v1/admin/agents/:id/approve
  Auth: Admin Session
  Content-Type: application/json

  { "note": "Endpoint verified, approved for registration" }

Response 200:
{
  "agent_id": "uuid",
  "status": "active",
  "sol_asset_address": "8Hk3nVf...xF9aPq",
  "ipfs_uri": "ipfs://QmX7k9...",
  "explorer_link": "https://explorer.solana.com/address/..."
}
```

#### `POST /v1/admin/agents/:id/reject`

```
Request:
  POST /v1/admin/agents/:id/reject
  Auth: Admin Session
  Content-Type: application/json

  { "note": "Endpoint returns 500, unable to verify" }

Response 200:
{
  "agent_id": "uuid",
  "status": "rejected",
  "review_note": "Endpoint returns 500, unable to verify"
}
```

#### `POST /v1/admin/agents/:id/suspend`

强制下架已上线 Agent。

```
Request:
  POST /v1/admin/agents/:id/suspend
  Auth: Admin Session
  Content-Type: application/json

  { "note": "Violation of terms" }

Response 200:
{
  "agent_id": "uuid",
  "status": "suspended"
}
```

---

## 十七、Admin Failed Receipts (`/admin/receipts`)

### 17.1 页面区块与接口映射

| 区块 | 功能描述 | 依赖接口 | 渲染方式 |
|------|---------|---------|---------|
| 导航栏 + 侧边栏 | 同 Admin Dashboard，Failed Receipts 高亮 | — | SSR |
| 页面标题 | "Failed Receipts" + 副标题说明 | 无 | 静态 |
| 警告横幅 | ⚠ "N receipts require attention" + 自动重试说明 | `GET /v1/admin/receipts/failed` (count) | SSR |
| 失败收据表格 | Receipt ID / Agent / Consumer / Amount / Error / Retries / Action | `GET /v1/admin/receipts/failed` | SSR |
| Retry 按钮 | 手动触发 IPFS 上传 / 链上锚定重试 | `POST /v1/admin/receipts/:id/retry` | 客户端交互 |

### 17.2 接口详情

#### `GET /v1/admin/receipts/failed`

上链失败的收据列表。

```
Request:
  GET /v1/admin/receipts/failed?page=1&limit=20
  Auth: Admin Session

Response 200:
{
  "receipts": [
    {
      "id": "rct_a8f3k2",
      "agent_name": "Contract Sentinel",
      "agent_id": "uuid",
      "consumer_wallet": "3Mq7...kR2p",
      "amount_usdc": 2.50,
      "error": "IPFS upload timeout (Pinata)",
      "feedback_status": "failed",
      "retry_count": 3,
      "max_retries": 3,
      "created_at": "2026-04-20T10:00:00Z"
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 20
}
```

#### `POST /v1/admin/receipts/:id/retry`

手动触发失败收据的上链重试。

```
Request:
  POST /v1/admin/receipts/:id/retry
  Auth: Admin Session

Response 200:
{
  "receipt_id": "rct_a8f3k2",
  "feedback_status": "pending",
  "retry_count": 4,
  "message": "Retry enqueued"
}

Response 400:
{
  "error": "ALREADY_SUBMITTED",
  "message": "Receipt feedback already submitted on-chain"
}
```

---

## 十八、Admin Users (`/admin/users`)

> **设计原则**: 不区分 Consumer / Provider 角色，与 Wallet 表无 role 字段的设计一致。通过 Agent / Order 关联聚合展示每个钱包的行为数据。

### 18.1 页面区块与接口映射

| 区块 | 功能描述 | 依赖接口 | 渲染方式 |
|------|---------|---------|---------|
| 导航栏 + 侧边栏 | 同 Admin Dashboard，Users 高亮 | — | SSR |
| 页面标题 | "Users" + "All connected wallets on the platform" | 无 | 静态 |
| 统计卡片行 | Total Wallets / Active This Week / New This Month | `GET /v1/admin/users/stats` | SSR |
| 搜索栏 | 按钱包地址搜索 | `GET /v1/admin/users` (带 search 参数) | 客户端交互 |
| 用户表格 | Wallet / Agents / Orders / Spending / Revenue / Last Active | `GET /v1/admin/users` | SSR + 客户端分页 |

### 18.2 接口详情

#### `GET /v1/admin/users`

钱包列表，Admin 用户管理使用。

```
Request:
  GET /v1/admin/users?search=7Hk3&sort=last_active&page=1&limit=20
  Auth: Admin Session

Query Parameters:
  - search: string   — 按钱包地址模糊搜索
  - sort: string     — 排序 (last_active | spending | revenue | agents | orders)，默认 last_active
  - page: number     — 页码
  - limit: number    — 每页数量

Response 200:
{
  "users": [
    {
      "wallet_id": "cuid",
      "pubkey": "7Hk3nVf...xF9aPq",
      "agents_count": 5,
      "orders_count": 156,
      "spending_usdc": 842,
      "revenue_usdc": 3118,
      "source": "cli",
      "last_active": "2026-04-20T12:30:00Z",
      "created_at": "2026-03-15T08:00:00Z"
    }
  ],
  "total": 312,
  "page": 1,
  "limit": 20
}
```

- **聚合字段说明**:
  - `agents_count`: COUNT(Agent WHERE providerWalletId = wallet.id AND status != 'rejected')
  - `orders_count`: COUNT(Order WHERE consumerWalletId = wallet.id)
  - `spending_usdc`: SUM(Order.paymentAmount WHERE consumerWalletId = wallet.id AND paymentVerified = true) / 1,000,000
  - `revenue_usdc`: SUM(Order.paymentAmount WHERE agent.providerWalletId = wallet.id AND paymentVerified = true) / 1,000,000
  - `last_active`: MAX(wallet.lastLoginAt)

#### `GET /v1/admin/users/stats`

```
Request:
  GET /v1/admin/users/stats
  Auth: Admin Session

Response 200:
{
  "total_wallets": 312,
  "active_this_week": 89,
  "new_this_month": 28
}
```

---

## 十九、接口汇总表（v4.0）


| 接口 | 方法 | 认证 | 页面 | 用途 |
|------|------|------|------|------|
| `/v1/public/market/stats` | GET | 无 | 首页 | 平台统计数据 |
| `/v1/public/market/agents` | GET | 无 | 首页 + Marketplace | Agent 列表 |
| `/v1/public/market/agents/:id` | GET | 无 | Agent 详情页 | Agent 完整信息 |
| `/v1/public/market/agents/:id/on-chain` | GET | 无 | 首页 + Marketplace + Agent 详情 | 链上身份与声誉 |
| `/v1/public/market/agents/:id/feedbacks` | GET | 无 | Agent 详情页 | 链上 Feedback 列表 |
| `/v1/public/match` | POST | 无 | 首页 | AI 语义匹配 Agent |
| `/v1/public/auth/challenge` | GET | 无 | 全局 Modal | 获取钱包签名挑战 |
| `/v1/public/auth/verify` | POST | 无 | 全局 Modal | 验证钱包签名，返回 JWT |
| **`/v1/user/dashboard`** | **GET** | **JWT** | **统一 Dashboard** | **消费 + 收入统计（新）** |
| **`/v1/user/orders`** | **GET** | **JWT** | **统一订单 + Dashboard** | **合并订单（Initiated + Received）（新）** |
| **`/v1/user/receipts`** | **GET** | **JWT** | **支付凭证** | **x402 支付记录（新）** |
| `/v1/provider/agents` | GET | JWT | Agent 列表 + Dashboard | 我的 Agent 列表 |
| `/v1/provider/agents/:id` | GET | JWT | Agent 详情 | Agent 完整详情 |
| `/v1/provider/agents` | POST | JWT | 新建 Agent | 提交新 Agent |
| `/v1/provider/agents/:id` | PATCH | JWT | Agent 详情 | 编辑 Agent |
| `/v1/provider/ratings` | GET | JWT | 评分页 | 收到的评分列表 |
| `/v1/provider/ratings/distribution` | GET | JWT | 评分页 | 评分分布 |
| **`/v1/admin/auth/login`** | **POST** | **无** | **Admin 登录** | **账号密码登录（v4.0 新增）** |
| **`/v1/admin/stats`** | **GET** | **Admin Session** | **Admin Dashboard** | **平台统计（v4.0 新增）** |
| **`/v1/admin/agents`** | **GET** | **Admin Session** | **Admin Agent Review** | **全部 Agent 列表（含 pending）（v4.0 新增）** |
| **`/v1/admin/agents/:id/approve`** | **POST** | **Admin Session** | **Admin Agent Review** | **审批通过 + ERC-8004 上链（v4.0 新增）** |
| **`/v1/admin/agents/:id/reject`** | **POST** | **Admin Session** | **Admin Agent Review** | **审批拒绝（v4.0 新增）** |
| **`/v1/admin/agents/:id/suspend`** | **POST** | **Admin Session** | **Admin Agent Review** | **强制下架（v4.0 新增）** |
| **`/v1/admin/receipts/failed`** | **GET** | **Admin Session** | **Admin Failed Receipts + Dashboard** | **失败收据列表（v4.0 新增）** |
| **`/v1/admin/receipts/:id/retry`** | **POST** | **Admin Session** | **Admin Failed Receipts** | **手动重试上链（v4.0 新增）** |
| **`/v1/admin/users`** | **GET** | **Admin Session** | **Admin Users** | **钱包列表 + 聚合统计（v4.0 新增）** |
| **`/v1/admin/users/stats`** | **GET** | **Admin Session** | **Admin Users** | **用户统计概览（v4.0 新增）** |

> **v4.0 变更**: 新增 10 个 `/v1/admin/*` 接口，覆盖 Admin 登录、Dashboard 统计、Agent 审批、失败收据管理、用户列表。Admin 认证独立于钱包签名体系，使用账号密码 + Session JWT。

---

## 二十、页面加载流程

### 20.1 统一 Dashboard 加载流程

```
浏览器请求 GET /dashboard
  │
  ├─ 来源判断:
  │   ├── 正常登录 → 从 cookie 读 JWT
  │   └── CLI 跳转 → URL 含 ?token=xxx → 写入 cookie → 清除 URL token
  │
  ├─ Middleware 验证 JWT:
  │   └── 无效 → 重定向 / (首页) + 弹出登录 Modal
  │
  ├─ SSR 并行请求 (带 JWT):
  │   ├── GET /v1/user/dashboard                 → 统一统计数据
  │   ├── GET /v1/provider/agents?limit=4         → My Agents 面板
  │   └── GET /v1/user/orders?limit=5             → 最近混合订单
  │
  └─ 用户交互:
      ├── [侧边栏 Orders]           → 跳转 /dashboard/orders
      ├── [侧边栏 Receipts]         → 跳转 /dashboard/receipts
      ├── [侧边栏 My Agents]        → 跳转 /dashboard/agents
      ├── [侧边栏 New Agent]        → 跳转 /dashboard/agents/new
      ├── [侧边栏 Ratings]          → 跳转 /dashboard/ratings
      ├── [Recent Orders → View All] → 跳转 /dashboard/orders
      ├── [My Agents → Manage]       → 跳转 /dashboard/agents
      └── [Back to Marketplace]      → 跳转 /marketplace
```

### 20.2 Agent 列表加载流程

```
浏览器请求 GET /dashboard/agents
  │
  ├─ SSR 请求:
  │   └── GET /v1/provider/agents
  │
  └─ 用户交互:
      ├── [搜索]       → GET /v1/provider/agents?search=xxx
      ├── [状态筛选]    → GET /v1/provider/agents?status=active
      ├── [点击 Edit]   → 跳转 /dashboard/agents/:id (编辑模式)
      ├── [点击 View]   → 跳转 /dashboard/agents/:id
      ├── [点击 Resubmit] → 跳转 /dashboard/agents/:id (编辑+重提交)
      └── [点击 New Agent] → 跳转 /dashboard/agents/new
```

### 15.3 新建 Agent 流程

```
浏览器请求 GET /dashboard/agents/new
  │
  └─ 用户交互:
      ├── [填写表单] → 纯前端状态
      ├── [点击 Submit for Review]
      │     └── POST /v1/provider/agents
      │           ├── 成功 → Toast + 跳转 /dashboard/agents
      │           └── 失败 → 显示字段级错误信息
      └── [点击 Cancel] → 跳转 /dashboard/agents
```

### 15.4 统一订单加载流程

```
浏览器请求 GET /dashboard/orders
  │
  ├─ SSR 请求:
  │   └── GET /v1/user/orders?page=1&limit=20
  │
  └─ 用户交互:
      ├── [搜索]         → GET /v1/user/orders?search=xxx
      ├── [类型筛选]      → GET /v1/user/orders?type=initiated
      ├── [状态筛选]      → GET /v1/user/orders?status=completed
      ├── [Agent 筛选]   → GET /v1/user/orders?agent_id=xxx
      ├── [翻页]         → GET /v1/user/orders?page=2
      └── [Export]       → GET /v1/user/orders?format=csv
```

---

## 二十一、前端实现建议

### 21.1 数据获取策略


| 场景 | 策略 | 工具 |
|------|------|------|
| 统一 Dashboard | SSR | Next.js Server Component + JWT cookie |
| Agent 列表首次加载 | SSR | Next.js Server Component |
| Agent 列表筛选 | CSR + SWR | `swr` 或 `@tanstack/react-query` |
| Agent 详情 | SSR | Next.js Server Component |
| 统一订单首次加载 | SSR | Next.js Server Component |
| 订单筛选/翻页 | CSR + SWR | 同 Marketplace |
| 支付凭证 | SSR + CSR 分页 | Server Component + client pagination |
| 评分 | SSR + CSR 分页 | Server Component + client pagination |
| 新建 Agent 提交 | CSR mutation | `fetch` + form state |
| Admin Dashboard | SSR | Server Component + Admin Session cookie |
| Admin Agent Review | SSR + CSR 筛选 | Server Component + client filter/pagination |
| Admin Failed Receipts | SSR | Server Component + Admin Session cookie |
| Admin Users | SSR + CSR 搜索 | Server Component + client search/pagination |


### 21.2 认证中间件

```typescript
// middleware.ts - Dashboard 路由保护 + CLI token 处理
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname.startsWith('/dashboard')) {
    // CLI 跳转：URL 中带 token → 写入 cookie → 清除 URL token
    const urlToken = searchParams.get('token');
    if (urlToken) {
      const cleanUrl = new URL(pathname, request.url);
      const response = NextResponse.redirect(cleanUrl);
      response.cookies.set('auth_token', urlToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 86400
      });
      return response;
    }

    // 正常登录检查
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/?login=true', request.url));
    }
  }

  // Admin 路由保护（独立认证体系）
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const adminToken = request.cookies.get('admin_token')?.value;
    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
}
```

### 21.3 错误处理


| 接口失败 | 降级方案 |
|---------|---------|
| user/dashboard | 显示 "—" 占位符 + 重试按钮 |
| user/orders | 显示空表格 + "No orders yet" |
| user/receipts | 显示空表格 + "No receipts yet" |
| provider/agents | 显示空状态 "No agents yet" + New Agent CTA |
| provider/agents/:id | 404 → 重定向到 Agent 列表 |
| provider/ratings | 显示 "No ratings yet" |
| POST provider/agents | 表单保持，显示字段级错误 |
| JWT 过期 | 全局拦截 → 弹出重新登录 Modal |
| Admin 登录失败 | 显示 "Invalid username or password" |
| Admin Session 过期 | 重定向 `/admin/login` |
| Admin approve/reject | 操作后刷新列表 + toast 确认 |
| Admin retry 失败 | 显示错误详情 + "Already submitted" 提示 |


