# Dev A 任务清单 — Marketplace + Provider

> 分支: `feat/dev-a-marketplace-provider`
> commit 前缀: `feat(dev-a):`
> 工作目录: `agenthub-gateway/`

---

## 独占目录

```
apps/gateway/src/routes/public-market/
apps/gateway/src/routes/provider/
apps/gateway/src/services/market/
apps/gateway/src/services/provider/
apps/web/src/app/marketplace/
apps/web/src/app/dashboard/agents/
apps/web/src/app/dashboard/ratings/
apps/web/src/lib/api/market.ts
apps/web/src/lib/api/provider.ts
apps/web/src/components/marketplace/
apps/web/src/components/provider/
packages/types/src/market.ts
packages/types/src/provider.ts
apps/gateway/src/lib/errors/market.ts
apps/gateway/src/lib/errors/provider.ts
```

---

## 开发顺序建议

先 Gateway 后 Web，每个功能点端到端完成再进入下一个。

---

## 任务列表

### A-1: 类型定义 + 错误码

- [ ] `packages/types/src/market.ts`：MarketAgent, MarketStats, AgentOnChainInfo, AgentFeedback, MatchRequest/Response 等接口
- [ ] `packages/types/src/provider.ts`：ProviderAgent, CreateAgentRequest, UpdateAgentRequest, RatingItem, RatingDistribution 等接口
- [ ] `lib/errors/market.ts`：AGENT_NOT_FOUND, AGENT_NOT_ACTIVE
- [ ] `lib/errors/provider.ts`：NOT_YOUR_AGENT, AGENT_UNDER_REVIEW

**验证**: TypeScript 编译通过

---

### A-2: Gateway — 平台统计 `GET /v1/public/market/stats`

- [ ] `services/market/index.ts`：`getMarketStats()` — 聚合 Agent(active) COUNT + Provider COUNT(DISTINCT providerWalletId) + Order COUNT + AVG(ratingAvg) + SUM(paymentAmount)
- [ ] `routes/public-market/index.ts`：注册 GET /stats 路由
- [ ] 测试：curl 验证返回格式与 api-dependencies 文档一致

**产出**: `{ total_agents, total_providers, total_orders, avg_rating, total_spending_usdc }`

---

### A-3: Gateway — Agent 列表 `GET /v1/public/market/agents`

- [ ] `services/market/index.ts`：`listAgents(query)` — 支持 search(name+description LIKE) / tags(JSON LIKE) / sort(rating|price|newest|calls) / order / min_price / max_price / page / limit / status
- [ ] `routes/public-market/index.ts`：注册 GET /agents 路由，解析 query params
- [ ] 返回格式：`{ agents: [...], total, page, limit, total_pages }`

**注意**: 
- Marketplace 默认 `limit=9, status=active`
- 首页 Featured 用 `limit=4, sort=rating, order=desc`
- price 字段需转换：DB 存 `priceUsdcMicro`（整数），API 返回 `price_usdc`（浮点数 / 1000000）

---

### A-4: Gateway — Agent 详情 `GET /v1/public/market/agents/:id`

- [ ] `services/market/index.ts`：`getAgentDetail(id)` — 查 Agent + JOIN provider Wallet
- [ ] `routes/public-market/index.ts`：注册 GET /agents/:id
- [ ] 返回完整 Agent 信息 + provider_wallet + provider_name（可用钱包地址缩写）

---

### A-5: Gateway — Agent 链上信息 `GET /v1/public/market/agents/:id/on-chain`

- [ ] `services/market/index.ts`：`getAgentOnChain(id)` — 查 DB 链上字段 + 调用 chain 包 `getAgentOnChainInfo()` + `checkAgentLiveness()`
- [ ] 返回 `{ agent_id, sol_asset_address, ipfs_metadata_uri, chain_status, creator, owner, reputation: { total_feedbacks, avg_score, transaction_count, rating_count }, liveness }`
- [ ] P1 阶段 chain 包返回 mock 数据，P2 后自动切换

---

### A-6: Gateway — Agent Feedback 列表 `GET /v1/public/market/agents/:id/feedbacks`

- [ ] `services/market/index.ts`：`getAgentFeedbacks(id, page, limit)` — 调用 chain 包 `getAgentFeedbacks()` 或从 Receipt/Rating 表聚合
- [ ] 返回 `{ feedbacks: [{ tag1, tag2, value, ipfs_cid, tx_signature, created_at }], total, page, limit }`

---

### A-7: Gateway — Provider Agent CRUD

- [ ] `services/provider/index.ts`：
  - `createAgent(walletId, data)` — INSERT Agent (status=pending_review)，capabilityTags/skills/domains 序列化为 JSON 字符串
  - `listMyAgents(walletId, query)` — WHERE providerWalletId，支持 search/status 筛选
  - `getMyAgent(walletId, agentId)` — 查询 + 验证所有权
  - `updateAgent(walletId, agentId, data)` — PATCH 可编辑字段，验证所有权 + 状态允许编辑
- [ ] `routes/provider/index.ts`：
  - POST /agents — 需 verifyWalletJwt
  - GET /agents — 需 verifyWalletJwt，支持 search/status/limit query
  - GET /agents/:id — 需 verifyWalletJwt
  - PATCH /agents/:id — 需 verifyWalletJwt
- [ ] 验证所有权：`agent.providerWalletId === request.user.wallet_id`

**注意**: priceUsdcMicro 转换 — 前端传 `price_usdc_micro`（整数），存 DB 原样存储

---

### A-8: Gateway — Provider 评分 `GET /v1/provider/ratings` + Distribution

- [ ] `services/provider/index.ts`：
  - `listMyRatings(walletId, query)` — JOIN Rating → Receipt → Agent WHERE agent.providerWalletId = walletId，支持 agent_id 筛选
  - `getRatingDistribution(walletId)` — GROUP BY score, COUNT
- [ ] `routes/provider/index.ts`：
  - GET /ratings — 评论列表（含 consumer_wallet、agent_name、feedbackTx）
  - GET /ratings/distribution — `{ distribution: { "5": N, "4": N, ... }, total, average }`

---

### A-9: Gateway — Provider 订单 + Dashboard

- [ ] `services/provider/index.ts`：
  - `listProviderOrders(walletId, query)` — WHERE agent.providerWalletId = walletId，支持 status/agent_id/page
  - `getProviderDashboard(walletId)` — 聚合收入、订单数、Agent 数、平均评分
- [ ] `routes/provider/index.ts`：
  - GET /orders
  - GET /dashboard

---

### A-10: Web API Client

- [ ] `lib/api/market.ts`：
  - `fetchMarketStats()`
  - `fetchAgents(params)` — 支持 search/tags/sort/page/limit
  - `fetchAgentDetail(id)`
  - `fetchAgentOnChain(id)`
  - `fetchAgentFeedbacks(id, page, limit)`
  - `matchAgent(task, options)`
- [ ] `lib/api/provider.ts`：
  - `fetchMyAgents(params)`
  - `fetchMyAgent(id)`
  - `createAgent(data)`
  - `updateAgent(id, data)`
  - `fetchMyRatings(params)`
  - `fetchRatingDistribution()`

**注意**: 所有认证请求从 cookie 读 JWT，通过 `Authorization: Bearer {token}` 发送

---

### A-11: Web — Marketplace 列表页 `/marketplace`

- [ ] `app/marketplace/page.tsx`：SSR 首次加载 + 客户端筛选
- [ ] `components/marketplace/agent-card.tsx`：Agent 卡片（名称 + 描述 + 标签 + 价格 + 评分 + 调用数 + Verified badge）
- [ ] `components/marketplace/search-bar.tsx`：搜索框
- [ ] `components/marketplace/filter-sidebar.tsx`：分类标签 + 价格区间
- [ ] `components/marketplace/sort-dropdown.tsx`：排序选择
- [ ] `components/marketplace/pagination.tsx`：分页组件
- [ ] URL 状态同步：筛选参数 ↔ URL query params（useSearchParams）

**数据获取**: SSR `fetchAgents({ sort: 'rating', limit: 9, status: 'active' })`，客户端交互用 SWR/React Query

---

### A-12: Web — Marketplace 详情页 `/marketplace/[id]`

- [ ] `app/marketplace/[id]/page.tsx`：Agent 完整详情
- [ ] 区块：
  - 基本信息（name, description, tags, pricing, provider）
  - 链上身份（sol_asset_address, ipfs_metadata, creator, owner, "View on 8004scan" 链接）
  - 声誉信息（avg_score, total_feedbacks, 评分趋势）
  - Feedback 列表（tag1/tag2 + value + IPFS 详情展开）
  - 存活检测（liveness 状态指示灯）
- [ ] SSR 加载 Agent 详情 + 客户端加载链上信息和 Feedback

---

### A-13: Web — Agent 列表页 `/dashboard/agents`

- [ ] `app/dashboard/agents/page.tsx`：我的 Agent 列表
- [ ] 搜索 + 状态筛选（All / Active / Pending / Rejected）
- [ ] Agent 卡片：名称 + 描述 + 标签 + 价格 + 评分 + 状态 badge + 链上标识
- [ ] 操作按钮：Edit / View / Resubmit（按 status 条件渲染）
- [ ] "New Agent" 按钮 → 跳转 `/dashboard/agents/new`
- [ ] 使用 Dashboard Layout（sidebar "My Agents" 高亮）

---

### A-14: Web — 新建 Agent `/dashboard/agents/new`

- [ ] `app/dashboard/agents/new/page.tsx`：Agent 提交表单
- [ ] 4 个区块：
  - Basic Information（name, description, capability_tags）
  - x402 Endpoint Configuration（endpoint_url, price_usdc_micro）+ x402 Info Banner
  - ERC-8004 Classification（skills multi-select, domains multi-select）
  - API Schema（input_schema JSON editor, output_format JSON editor）— 可选
- [ ] 提交调用 `POST /v1/provider/agents`
- [ ] 成功 → Toast "Agent submitted successfully. Awaiting admin review." + 跳转 Agent 列表
- [ ] 失败 → 字段级错误展示

---

### A-15: Web — Agent 详情页 `/dashboard/agents/[id]`

- [ ] `app/dashboard/agents/[id]/page.tsx`：Agent 配置详情 + 编辑
- [ ] 区块：
  - 面包屑 (My Agents > Agent Name)
  - 头部 (name + status badge + 链上标识 + description + tags)
  - 统计卡片 (Price / Total Orders / Avg Rating / Avg Response)
  - Agent Configuration (endpoint_url, price, created_at, updated_at)
  - ERC-8004 Classification (skills 紫色 pills / domains 绿色 pills)
  - On-Chain Identity (asset address, IPFS CID, register TX, chain status, registered_at)
  - Edit Agent 按钮 → 编辑模式 → `PATCH /v1/provider/agents/:id`

---

### A-16: Web — 评分页 `/dashboard/ratings`

- [ ] `app/dashboard/ratings/page.tsx`
- [ ] 区块：
  - 总评分卡片（整体评分 + 星级 + 总评论数 + 链上验证标记）
  - 评分分布柱状图（1-5 星）— 调用 `GET /v1/provider/ratings/distribution`
  - Agent 筛选下拉
  - 评论列表（consumer 地址 + agent 名称 + 星级 + 评论 + 链上 TX 链接）
  - 分页
- [ ] 使用 Dashboard Layout（sidebar "Ratings" 高亮）

---

## 验收标准

1. **Gateway 所有路由** curl 可访问，返回格式与 api-dependencies 文档完全一致
2. **Marketplace 页面** SSR + 客户端筛选/排序/分页/搜索全部可用
3. **Provider Agent CRUD** 创建 → 列表可见 → 详情完整 → 编辑保存
4. **评分页** 分布图 + 评论列表 + 分页 + 链上 TX 链接
5. **Dashboard Layout** 侧边栏高亮正确切换
6. **URL 同步** Marketplace 筛选参数在 URL 中持久化

---

*最后更新: 2026-04-20*
