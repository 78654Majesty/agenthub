# AgentHub 数据库设计文档

> 版本: v1.1 | 日期: 2026-04-20 | 数据库: SQLite + Prisma ORM (WAL mode)
> 来源: [agenthub-spec-v1.md](../spec/agenthub-spec-v1.md) (Prisma Schema) + [api-dependencies-web-pages.md](../spec/api-dependencies-web-pages.md) v4.0 (界面需求，含 Admin 页面)

---

## 一、UML 实体关系图

```
┌──────────────────────┐
│      AdminUser       │
│──────────────────────│
│ PK id                │
│    username (UQ)     │
│    passwordHash      │
│    createdAt         │
│    lastLoginAt       │
└──────────────────────┘
        (独立，不关联 Wallet)


┌──────────────────────┐         1:N          ┌──────────────────────────────┐
│       Wallet         │ ◄───────────────────▷ │            Agent             │
│──────────────────────│   providerWalletId    │──────────────────────────────│
│ PK id                │                       │ PK id                        │
│    pubkey (UQ)       │                       │ FK providerWalletId          │
│    source            │                       │    name                      │
│    createdAt         │                       │    description               │
│    lastLoginAt       │                       │    capabilityTags (JSON)     │
│                      │                       │    skills (JSON)             │
│                      │                       │    domains (JSON)            │
│                      │                       │    priceUsdcMicro            │
│                      │                       │    endpointUrl               │
│                      │                       │    inputSchema (JSON?)       │
│                      │                       │    outputFormat (JSON?)      │
│                      │                       │    status                    │
│                      │                       │    reviewNote                │
│                      │                       │    reviewedAt                │
│                      │                       │    sol_asset / ipfs / chain  │
│                      │                       │    rating / order 统计         │
│                      │                       │    createdAt / updatedAt     │
└──────────────────────┘                       └──────────────────────────────┘
     │                                              │          │          │
     │ 1:N                                    1:N   │    1:N   │    1:N   │
     ▼                                              ▼          ▼          ▼
┌──────────────────────┐        1:N          ┌────────────────────────────────┐
│       Quote          │ ◄──────────────────▷│            Order               │
│──────────────────────│    agentId          │────────────────────────────────│
│ PK id                │                     │ PK id                          │
│ FK agentId           │                     │ FK quoteId (UQ)                │
│ FK consumerWalletId  │─────1:1────────────▷│ FK agentId                     │
│    taskText          │                     │ FK consumerWalletId            │
│    amountUsdcMicro   │                     │    status                      │
│    status            │                     │    paymentTx / Verified / ...  │
│    expiresAt         │                     │    resultHash / responseTimeMs │
│    createdAt         │                     │    errorCode                   │
└──────────────────────┘                     │    createdAt / updatedAt       │
                                             └────────────────────────────────┘
                                                            │
                                                       1:1  │
                                                            ▼
                                             ┌────────────────────────────────┐
                                             │           Receipt              │
                                             │────────────────────────────────│
                                             │ PK id                          │
                                             │ FK orderId (UQ)                │
                                             │ FK agentId                     │
                                             │ FK consumerWalletId            │
                                             │    receiptHash                 │
                                             │    amountUsdcMicro             │
                                             │    feedbackStatus / Tx / Ipfs  │
                                             │    retryCount                  │
                                             │    feedbackAt                  │
                                             │    createdAt                   │
                                             └────────────────────────────────┘
                                                            │
                                                       1:0..1│
                                                            ▼
                                             ┌────────────────────────────────┐
                                             │           Rating               │
                                             │────────────────────────────────│
                                             │ PK id                          │
                                             │ FK receiptId (UQ)              │
                                             │ FK agentId                     │
                                             │ FK consumerWalletId            │
                                             │    score (1-5)                 │
                                             │    comment                     │
                                             │    feedbackStatus / Tx / Ipfs  │
                                             │    retryCount                  │
                                             │    createdAt                   │
                                             └────────────────────────────────┘


┌──────────────────────┐
│    AuthChallenge     │
│──────────────────────│
│ PK id                │
│    wallet            │
│    nonce (UQ)        │
│    used              │
│    expiresAt         │
│    createdAt         │
└──────────────────────┘
```

### 关系总结

```
Wallet ──1:N──▷ Agent        (Provider 身份推断)
Wallet ──1:N──▷ Quote        (Consumer 身份推断)
Wallet ──1:N──▷ Order        (Consumer 身份推断)
Wallet ──1:N──▷ Receipt      (Consumer 身份推断)
Wallet ──1:N──▷ Rating       (Consumer 身份推断)

Agent  ──1:N──▷ Quote
Agent  ──1:N──▷ Order
Agent  ──1:N──▷ Receipt
Agent  ──1:N──▷ Rating

Quote  ──1:1──▷ Order        (一个报价产生一个订单)
Order  ──1:1──▷ Receipt      (一个订单产生一张收据)
Receipt──1:0..1▷ Rating      (收据可选评分)

AdminUser 独立表，不关联 Wallet
AuthChallenge 独立表，临时认证数据
```

---

## 二、表结构详细说明

### 2.1 wallets — 钱包身份表

> 无 role 字段。通过关联推断身份：有 Agent = Provider，有 Order = Consumer，可同时兼具。

| 字段 | 类型 | 约束 | 中文说明 |
|------|------|------|---------|
| id | String | PK, CUID | 主键 |
| pubkey | String | UNIQUE | Solana 钱包公钥（Base58） |
| source | String | DEFAULT "cli" | 创建来源：`"cli"` / `"web"`（仅统计用） |
| createdAt | DateTime | DEFAULT now() | 首次连接时间 |
| lastLoginAt | DateTime? | NULL | 最近登录时间 |

**索引**: pubkey (UNIQUE)

**界面用途**:
- 登录 Modal: 钱包连接后创建/查找记录
- Dashboard 头部: 显示钱包地址
- CLI ah:connect: 创建钱包记录 + 认证

---

### 2.2 auth_challenges — 认证挑战表

> 替代 Redis 的 challenge-response 认证。短生命周期。

| 字段 | 类型 | 约束 | 中文说明 |
|------|------|------|---------|
| id | String | PK, CUID | 主键 |
| wallet | String | INDEX | 请求挑战的钱包地址 |
| nonce | String | UNIQUE | 随机 nonce（防重放） |
| used | Boolean | DEFAULT false | 是否已使用 |
| expiresAt | DateTime | INDEX | 过期时间（通常 5 分钟） |
| createdAt | DateTime | DEFAULT now() | 创建时间 |

**索引**: wallet, expiresAt, nonce (UNIQUE)

**界面用途**:
- 登录 Modal: `GET /v1/public/auth/challenge` → `POST /v1/public/auth/verify`
- CLI ah:connect: 同上流程

---

### 2.3 admin_users — 管理员账户表

> 独立于钱包体系，账号密码登录。

| 字段 | 类型 | 约束 | 中文说明 |
|------|------|------|---------|
| id | String | PK, CUID | 主键 |
| username | String | UNIQUE | 登录用户名 |
| passwordHash | String | NOT NULL | bcrypt 密码哈希 |
| createdAt | DateTime | DEFAULT now() | 创建时间 |
| lastLoginAt | DateTime? | NULL | 最近登录时间 |

**界面用途**:
| 界面 | 使用字段 |
|------|---------|
| Admin 登录页 | username, passwordHash (验证) |
| Admin Dashboard 导航栏 | username (显示当前用户) |
| Admin 所有页面 | lastLoginAt (Session 管理) |

---

### 2.4 agents — Agent 定义表

> 核心业务表。记录 Provider 提交的 Agent 及其链上注册状态。

| 字段 | 类型 | 约束 | 中文说明 |
|------|------|------|---------|
| id | String | PK, CUID | 主键 |
| providerWalletId | String | FK → Wallet, INDEX | 所属 Provider 钱包 |
| name | String | NOT NULL | Agent 名称 |
| description | String | NOT NULL | Agent 功能描述（用于 Marketplace 展示 + AI 匹配） |
| capabilityTags | String | NOT NULL | JSON 数组：自定义标签，如 `["security","audit","solana"]` |
| skills | String | DEFAULT "[]" | JSON 数组：ERC-8004 标准技能分类，如 `["nlp/code_review"]` |
| domains | String | DEFAULT "[]" | JSON 数组：ERC-8004 标准领域分类，如 `["technology/software_eng"]` |
| priceUsdcMicro | Int | NOT NULL | 每次调用价格（USDC × 1,000,000），如 2500000 = 2.50 USDC |
| endpointUrl | String | NOT NULL | x402 服务端 URL（必须实现 HTTP 402 协议） |
| inputSchema | String? | NULL | JSON：描述 Agent 接受的输入格式（可选） |
| outputFormat | String? | NULL | JSON：描述 Agent 返回的输出格式（可选） |
| model | String? | NULL | ~~已从界面删除~~，DB 保留但不再使用 |
| imageUrl | String? | NULL | ~~已从界面删除~~，DB 保留但不再使用 |
| status | String | DEFAULT "pending_review" | 审批状态枚举（见下方） |
| reviewNote | String? | NULL | Admin 审批备注（拒绝原因等） |
| reviewedAt | DateTime? | NULL | Admin 审批时间 |
| solAssetAddress | String? | NULL | ERC-8004 Core NFT 地址（链上注册后填入） |
| ipfsCid | String? | NULL | IPFS 元数据 CID |
| ipfsUri | String? | NULL | 完整 IPFS URI (`ipfs://Qm...`) |
| solPublishTx | String? | NULL | 注册上链的 Solana TX signature |
| chainStatus | String | DEFAULT "none" | 链上状态枚举（见下方） |
| registeredAt | DateTime? | NULL | 链上注册完成时间 |
| ratingAvg | Float | DEFAULT 0 | 平均评分（冗余缓存，可与链上对比验证） |
| ratingCount | Int | DEFAULT 0 | 评分总数 |
| totalOrders | Int | DEFAULT 0 | 订单总数 |
| avgResponseTimeMs | Int | DEFAULT 0 | 平均响应时间（毫秒） |
| createdAt | DateTime | DEFAULT now() | 创建时间 |
| updatedAt | DateTime | @updatedAt | 最近更新时间 |

**status 枚举值**:
| 值 | 中文说明 | 触发条件 |
|---|---------|---------|
| `pending_review` | 待审核 | Provider 提交后默认状态 |
| `approved` | 审核通过（待上链） | Admin 批准 |
| `rejected` | 审核拒绝 | Admin 拒绝 |
| `active` | 已激活（可用） | 链上注册完成 |
| `suspended` | 已暂停 | Admin 手动暂停 |

**chainStatus 枚举值**:
| 值 | 中文说明 |
|---|---------|
| `none` | 未上链 |
| `uploading` | IPFS 上传中 / 链上注册中 |
| `registered` | 已注册 |
| `failed` | 注册失败 |

**索引**: status, chainStatus, providerWalletId

**界面用途**:
| 界面 | 使用字段 |
|------|---------|
| 首页 Featured Agents | name, description, capabilityTags, priceUsdcMicro, ratingAvg, status |
| Marketplace 列表 | 同上 + totalOrders, domains, skills |
| Dashboard "My Agents" 面板 | name, status, chainStatus, ratingAvg, totalOrders |
| Agent 列表页 | 全部展示字段 |
| New Agent 表单 | name, description, capabilityTags, endpointUrl, priceUsdcMicro, skills, domains, inputSchema, outputFormat |
| Agent 详情页 | 全部字段（含链上信息） |
| CLI ah:market | name, priceUsdcMicro, ratingAvg, totalOrders, status |
| CLI ah:run (match) | name, description, capabilityTags, skills, priceUsdcMicro, endpointUrl, ratingAvg, solAssetAddress |
| Admin Agent Review | name, providerWalletId, priceUsdcMicro, capabilityTags, status, reviewNote, createdAt |
| Admin Dashboard "Recent Submissions" | name, providerWalletId, status, createdAt |
| Admin Dashboard 统计卡片 | status (COUNT 聚合 active/pending/rejected) |

---

### 2.5 quotes — 报价表

> 记录 CLI `match_capability` 的匹配结果。用户确认前为 `pending`，确认后生成 Order。

| 字段 | 类型 | 约束 | 中文说明 |
|------|------|------|---------|
| id | String | PK, CUID | 主键 |
| agentId | String | FK → Agent, INDEX | 被匹配的 Agent |
| consumerWalletId | String | FK → Wallet | 发起匹配的 Consumer 钱包 |
| taskText | String | NOT NULL | 用户描述的任务文本 |
| amountUsdcMicro | Int | NOT NULL | 报价金额（USDC micro） |
| status | String | DEFAULT "pending" | `"pending"` / `"accepted"` / `"expired"` / `"cancelled"` |
| expiresAt | DateTime | INDEX | 报价过期时间 |
| createdAt | DateTime | DEFAULT now() | 创建时间 |

**索引**: status, expiresAt

**界面用途**:
- CLI ah:run: `match_capability` → 创建 Quote → 用户确认 → 生成 Order
- Web 界面不直接展示 Quote（内部流转）

---

### 2.6 orders — 订单表

> 核心交易表。记录 x402 支付交易结果。统一订单页同时展示 Initiated 和 Received。

| 字段 | 类型 | 约束 | 中文说明 |
|------|------|------|---------|
| id | String | PK, CUID | 主键 |
| quoteId | String | FK → Quote, UNIQUE | 关联报价（1:1） |
| agentId | String | FK → Agent, INDEX | 被调用的 Agent |
| consumerWalletId | String | FK → Wallet, INDEX | 发起调用的 Consumer 钱包 |
| status | String | DEFAULT "pending" | `"pending"` / `"completed"` / `"failed"` |
| paymentTx | String? | NULL | Solana TX signature（Agent server 广播上链） |
| paymentVerified | Boolean | DEFAULT false | Gateway 链上验证通过 |
| paymentPayer | String? | NULL | 实际付款钱包地址 |
| paymentAmount | Int? | NULL | 实际支付金额（USDC micro） |
| paymentNetwork | String? | NULL | 网络标识，如 `"solana:devnet"` |
| resultHash | String? | NULL | SHA256(result)，Plugin 上报 |
| responseTimeMs | Int? | NULL | Agent 响应时间（毫秒） |
| errorCode | String? | NULL | 失败时的错误码 |
| createdAt | DateTime | DEFAULT now() | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |

**索引**: status, agentId, consumerWalletId

**统一订单页 `type` 字段实现逻辑**（非 DB 字段，API 层计算）:
```
if order.consumerWalletId == 当前用户钱包 → type = "initiated"（我发起的）
if order.agent.providerWalletId == 当前用户钱包 → type = "received"（我的 Agent 被调用）
```

**`counterparty_wallet` 计算逻辑**:
```
if type == "initiated" → counterparty = agent.providerWallet.pubkey
if type == "received"  → counterparty = order.consumerWallet.pubkey
```

**界面用途**:
| 界面 | 使用字段 |
|------|---------|
| Dashboard "Recent Orders" 面板 | id, type(计算), agentName(JOIN), counterparty(计算), amount, status, paymentTx, createdAt |
| 统一订单页 | 全部 + type/counterparty 计算字段 |
| CLI ah:run | 创建 Order → 更新 payment 信息 |
| CLI ah:receipt | 通过 Order → Receipt 链查询 |

---

### 2.7 receipts — 收据表

> 记录 x402 支付凭证。关联 ERC-8004 Feedback 上链。

| 字段 | 类型 | 约束 | 中文说明 |
|------|------|------|---------|
| id | String | PK, CUID | 主键 |
| orderId | String | FK → Order, UNIQUE | 关联订单（1:1） |
| agentId | String | FK → Agent | 关联 Agent |
| consumerWalletId | String | FK → Wallet, INDEX | Consumer 钱包 |
| receiptHash | String | NOT NULL | SHA256(receipt data) |
| amountUsdcMicro | Int | NOT NULL | 支付金额（USDC micro） |
| feedbackStatus | String | DEFAULT "pending" | ERC-8004 Feedback 上链状态 |
| feedbackTx | String? | NULL | Feedback 上链 TX signature |
| feedbackIpfsCid | String? | NULL | Feedback detail JSON 的 IPFS CID |
| retryCount | Int | DEFAULT 0 | 上链重试次数 |
| feedbackAt | DateTime? | NULL | Feedback 上链完成时间 |
| createdAt | DateTime | DEFAULT now() | 创建时间 |

**feedbackStatus 枚举值**: `"pending"` / `"submitted"` / `"failed"`

**索引**: feedbackStatus, consumerWalletId

**支付凭证页 `type` 字段实现逻辑**（非 DB 字段，API 层计算）:
```
if receipt.consumerWalletId == 当前用户钱包 → type = "payment"（我支付的）
if receipt.agent.providerWalletId == 当前用户钱包 → type = "received"（我收到的）
```

**界面用途**:
| 界面 | 使用字段 |
|------|---------|
| 支付凭证页 | id, type(计算), agentName(JOIN), amountUsdcMicro, paymentTx(JOIN Order), paymentNetwork(JOIN), createdAt |
| CLI ah:receipt | 全部字段 + JOIN Order 获取 paymentTx |
| Agent 详情页 "On-Chain Identity" | feedbackTx, feedbackIpfsCid |
| Admin Failed Receipts | id, agentId(JOIN name), consumerWalletId, amountUsdcMicro, feedbackStatus, retryCount, createdAt |
| Admin Dashboard "Failed Receipts" 面板 | id, agentId(JOIN name), amountUsdcMicro, feedbackStatus="failed", createdAt |

---

### 2.8 ratings — 评分表

> 用户对 Agent 的评分。通过 ERC-8004 Feedback 上链（tag1="starred"）。

| 字段 | 类型 | 约束 | 中文说明 |
|------|------|------|---------|
| id | String | PK, CUID | 主键 |
| receiptId | String | FK → Receipt, UNIQUE | 关联收据（1:0..1） |
| agentId | String | FK → Agent, INDEX | 被评分的 Agent |
| consumerWalletId | String | FK → Wallet | 评分者钱包 |
| score | Int | NOT NULL, 1-5 | 评分（1-5 星） |
| comment | String? | NULL | 评论内容 |
| feedbackStatus | String | DEFAULT "pending" | 评分上链状态 |
| feedbackTx | String? | NULL | 评分上链 TX signature |
| feedbackIpfsCid | String? | NULL | 评分 detail JSON 的 IPFS CID |
| retryCount | Int | DEFAULT 0 | 上链重试次数 |
| createdAt | DateTime | DEFAULT now() | 创建时间 |

**索引**: agentId, feedbackStatus

**界面用途**:
| 界面 | 使用字段 |
|------|---------|
| 评分页 评论列表 | agentName(JOIN), consumerWallet(JOIN), score, comment, feedbackStatus, feedbackTx, feedbackIpfsCid, createdAt |
| 评分页 分布图 | score (聚合统计 1-5 分布) |
| Dashboard 统计 | score (聚合 AVG) |
| CLI ah:run (rate) | 创建 Rating |

---

## 三、数据流转：核心业务链路

### 3.1 CLI ah:run 全流程数据流

```
1. Plugin → Gateway: POST /v1/public/match {task}
   └─ Gateway: 查询 Agent 表 (status=active) → AI rerank → 返回 top Agent
   └─ 创建 Quote 记录 (status=pending)

2. 用户确认 → Plugin: x402Fetch(endpoint, {task})
   └─ Quote.status → "accepted"

3. x402 支付完成 → Plugin → Gateway: POST /v1/consumer/receipts
   └─ 创建 Order 记录:
       consumerWalletId, agentId, quoteId
       paymentTx, paymentPayer, paymentAmount, paymentNetwork
       resultHash, responseTimeMs
   └─ Gateway 链上验证 TX → paymentVerified = true → status = "completed"
   └─ 创建 Receipt 记录:
       orderId, agentId, consumerWalletId
       receiptHash, amountUsdcMicro
   └─ 更新 Agent 统计: totalOrders++, avgResponseTimeMs 重算

4. 异步 Worker: Receipt → ERC-8004 Feedback 上链
   └─ Receipt.feedbackStatus: pending → submitted
   └─ 填入 feedbackTx, feedbackIpfsCid, feedbackAt

5. 可选评分 → Gateway: POST /v1/consumer/ratings
   └─ 创建 Rating 记录: receiptId, agentId, score, comment
   └─ 异步 Worker: Rating → ERC-8004 Feedback 上链 (tag1="starred")
   └─ 更新 Agent 统计: ratingAvg 和 ratingCount 重算
```

### 3.2 Provider 提交 Agent 数据流

```
1. Web 表单 → Gateway: POST /v1/provider/agents
   └─ 创建 Agent 记录 (status=pending_review)

2. Admin 审核通过 → Gateway:
   └─ Agent.status → "approved"
   └─ 构建 ERC-8004 Registration File (含 skills, domains, endpoint)
   └─ 上传 IPFS → ipfsCid, ipfsUri
   └─ 调用 8004-solana SDK 注册 → solAssetAddress, solPublishTx
   └─ Agent.chainStatus → "registered", Agent.status → "active"
```

---

## 四、界面需求覆盖度检查

### 4.1 Web 界面 ↔ 数据表映射

| 页面 | 路由 | 主查询表 | JOIN 表 | 覆盖 |
|------|------|---------|---------|------|
| 未登录首页 | `/` | Agent | — | ✅ stats 通过 Agent 聚合 |
| Marketplace | `/marketplace` | Agent | — | ✅ 所有展示字段均在 Agent 表 |
| 登录 Modal | 全局 | Wallet + AuthChallenge | — | ✅ |
| 统一 Dashboard | `/dashboard` | Agent + Order + Receipt + Rating | Wallet | ✅ spending/revenue 从 Order 聚合 |
| 统一订单页 | `/dashboard/orders` | Order | Agent, Wallet | ✅ type 由 API 层计算 |
| 支付凭证页 | `/dashboard/receipts` | Receipt | Order, Agent, Wallet | ✅ type 由 API 层计算 |
| Agent 列表 | `/dashboard/agents` | Agent | — | ✅ |
| 新建 Agent | `/dashboard/agents/new` | Agent (INSERT) | — | ✅ skills/domains 已有字段 |
| Agent 详情 | `/dashboard/agents/[id]` | Agent | — | ✅ 含链上字段 |
| 评分页 | `/dashboard/ratings` | Rating | Agent, Wallet, Receipt | ✅ |
| Admin 登录 | `/admin/login` | AdminUser | — | ✅ 账号密码验证 |
| Admin Dashboard | `/admin/dashboard` | Agent + Order + Receipt + Wallet | — | ✅ 聚合统计 + 最近提交 + 失败收据 |
| Admin Agent Review | `/admin/agents` | Agent | Wallet | ✅ 状态筛选 + 审批操作 |
| Admin Failed Receipts | `/admin/receipts` | Receipt | Agent, Order, Wallet | ✅ feedbackStatus=failed 筛选 |
| Admin Users | `/admin/users` | Wallet | Agent, Order | ✅ 聚合 Agent 数/订单数/消费/收入 |

### 4.2 CLI 界面 ↔ 数据表映射

| CLI 命令 | 操作 | 主表 | 覆盖 |
|----------|------|------|------|
| ah:connect | Wallet 创建/查找 + AuthChallenge | Wallet, AuthChallenge | ✅ |
| ah:market | Agent 列表查询 | Agent | ✅ |
| ah:run (match) | Agent 查询 + Quote 创建 | Agent, Quote | ✅ |
| ah:run (execute) | Order + Receipt 创建 | Order, Receipt | ✅ |
| ah:run (rate) | Rating 创建 | Rating | ✅ |
| ah:receipt | Receipt 查询 | Receipt, Order, Agent | ✅ |
| ah:dashboard | JWT 生成跳转 | Wallet (读取) | ✅ |

### 4.3 计算字段说明（非 DB 存储）

以下字段在 API 层计算，**不存储在数据库中**：

| API 字段 | 计算方式 | 使用页面 |
|----------|---------|---------|
| `order.type` ("initiated"/"received") | 比较 consumerWalletId / agent.providerWalletId 与当前用户 | 统一订单页, Dashboard |
| `order.counterparty_wallet` | type=initiated → provider 钱包; type=received → consumer 钱包 | 统一订单页 |
| `order.agent_name` | JOIN Agent.name | 订单页, Dashboard |
| `receipt.type` ("payment"/"received") | 同 order.type 逻辑 | 支付凭证页 |
| `receipt.payment_tx` / `payment_network` | JOIN Order.paymentTx / paymentNetwork | 支付凭证页 |
| `dashboard.spending` | SUM(Order.paymentAmount) WHERE consumerWalletId = 当前用户 | Dashboard |
| `dashboard.revenue` | SUM(Order.paymentAmount) WHERE agent.providerWalletId = 当前用户 | Dashboard |
| `ratings.distribution` | GROUP BY score, COUNT(*) | 评分页 |
| `admin.stats.total_agents` | COUNT(Agent) | Admin Dashboard |
| `admin.stats.pending_review` | COUNT(Agent WHERE status='pending_review') | Admin Dashboard |
| `admin.stats.total_orders` | COUNT(Order) | Admin Dashboard |
| `admin.stats.total_revenue` | SUM(Order.paymentAmount WHERE paymentVerified=true) | Admin Dashboard |
| `admin.stats.active_wallets` | COUNT(Wallet) | Admin Dashboard |
| `admin.users.agents_count` | COUNT(Agent WHERE providerWalletId=wallet) | Admin Users |
| `admin.users.orders_count` | COUNT(Order WHERE consumerWalletId=wallet) | Admin Users |
| `admin.users.spending` | SUM(Order.paymentAmount WHERE consumerWalletId=wallet) | Admin Users |
| `admin.users.revenue` | SUM(Order.paymentAmount WHERE agent.providerWalletId=wallet) | Admin Users |

---

## 五、Prisma Schema（最终版，含注释）

> 注意：`model` 和 `imageUrl` 字段保留在 Schema 中但**已从界面删除**，数据库兼容旧数据。

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 钱包身份（Consumer + Provider 共用，无 role 字段）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model Wallet {
  id          String   @id @default(cuid())
  pubkey      String   @unique          // Solana 钱包公钥（Base58）
  source      String   @default("cli")  // 创建来源: "cli" | "web"
  createdAt   DateTime @default(now())
  lastLoginAt DateTime?

  agents      Agent[]    // 作为 Provider
  quotes      Quote[]    // 作为 Consumer
  orders      Order[]    // 作为 Consumer
  receipts    Receipt[]  // 作为 Consumer
  ratings     Rating[]   // 作为 Consumer

  @@map("wallets")
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 认证挑战（短生命周期，替代 Redis）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model AuthChallenge {
  id        String   @id @default(cuid())
  wallet    String                       // 请求钱包地址
  nonce     String   @unique             // 随机 nonce（防重放）
  used      Boolean  @default(false)     // 是否已使用
  expiresAt DateTime                     // 过期时间
  createdAt DateTime @default(now())

  @@index([wallet])
  @@index([expiresAt])
  @@map("auth_challenges")
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 管理员账户（独立于钱包体系）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model AdminUser {
  id           String   @id @default(cuid())
  username     String   @unique          // 登录用户名
  passwordHash String                    // bcrypt hash
  createdAt    DateTime @default(now())
  lastLoginAt  DateTime?

  @@map("admin_users")
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Agent 定义（核心业务表）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model Agent {
  id               String   @id @default(cuid())
  providerWalletId String
  providerWallet   Wallet   @relation(fields: [providerWalletId], references: [id])

  // ── 基础信息 ──
  name             String                    // Agent 名称
  description      String                    // 功能描述
  capabilityTags   String                    // JSON: ["security","audit","solana"]
  skills           String   @default("[]")   // JSON: ERC-8004 技能分类
  domains          String   @default("[]")   // JSON: ERC-8004 领域分类
  priceUsdcMicro   Int                       // 单次调用价格 (USDC × 10^6)
  endpointUrl      String                    // x402 服务端 URL

  // ── 可选扩展 ──
  inputSchema      String?                   // JSON: 输入格式定义
  outputFormat     String?                   // JSON: 输出格式定义
  model            String?                   // [已弃用] 保留兼容
  imageUrl         String?                   // [已弃用] 保留兼容

  // ── 审批状态 ──
  status           String   @default("pending_review")
  reviewNote       String?                   // Admin 审批备注
  reviewedAt       DateTime?

  // ── ERC-8004 链上信息 ──
  solAssetAddress  String?                   // Core NFT 地址
  ipfsCid          String?                   // IPFS 元数据 CID
  ipfsUri          String?                   // ipfs://Qm... 完整 URI
  solPublishTx     String?                   // 注册上链 TX signature
  chainStatus      String   @default("none") // "none"|"uploading"|"registered"|"failed"
  registeredAt     DateTime?

  // ── 冗余统计缓存 ──
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 报价（CLI match → 用户确认前的中间态）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model Quote {
  id               String   @id @default(cuid())
  agentId          String
  agent            Agent    @relation(fields: [agentId], references: [id])
  consumerWalletId String
  consumerWallet   Wallet   @relation(fields: [consumerWalletId], references: [id])

  taskText         String                    // 用户任务描述
  amountUsdcMicro  Int                       // 报价金额
  status           String   @default("pending") // "pending"|"accepted"|"expired"|"cancelled"
  expiresAt        DateTime                  // 报价过期时间
  createdAt        DateTime @default(now())

  order            Order?

  @@index([status])
  @@index([expiresAt])
  @@map("quotes")
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 订单（记录 x402 交易结果）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model Order {
  id               String   @id @default(cuid())
  quoteId          String   @unique
  quote            Quote    @relation(fields: [quoteId], references: [id])
  agentId          String
  agent            Agent    @relation(fields: [agentId], references: [id])
  consumerWalletId String
  consumerWallet   Wallet   @relation(fields: [consumerWalletId], references: [id])

  status           String   @default("pending") // "pending"|"completed"|"failed"

  // ── x402 支付信息 ──
  paymentTx        String?                   // Solana TX signature
  paymentVerified  Boolean  @default(false)   // Gateway 链上验证通过
  paymentPayer     String?                   // 实际付款钱包
  paymentAmount    Int?                      // 实际支付金额 (USDC micro)
  paymentNetwork   String?                   // "solana:devnet"

  // ── Agent 执行结果 ──
  resultHash       String?                   // SHA256(result)
  responseTimeMs   Int?                      // 响应时间 (ms)
  errorCode        String?                   // 失败错误码

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  receipt          Receipt?

  @@index([status])
  @@index([agentId])
  @@index([consumerWalletId])
  @@map("orders")
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 收据（ERC-8004 Feedback 上链载体）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model Receipt {
  id               String   @id @default(cuid())
  orderId          String   @unique
  order            Order    @relation(fields: [orderId], references: [id])
  agentId          String
  agent            Agent    @relation(fields: [agentId], references: [id])
  consumerWalletId String
  consumerWallet   Wallet   @relation(fields: [consumerWalletId], references: [id])

  receiptHash      String                    // SHA256(receipt data)
  amountUsdcMicro  Int                       // 支付金额 (USDC micro)

  // ── ERC-8004 Feedback 上链 ──
  feedbackStatus   String   @default("pending") // "pending"|"submitted"|"failed"
  feedbackTx       String?                   // Feedback TX signature
  feedbackIpfsCid  String?                   // Feedback IPFS CID
  retryCount       Int      @default(0)      // 上链重试次数
  feedbackAt       DateTime?                 // 上链完成时间

  createdAt        DateTime @default(now())

  rating           Rating?

  @@index([feedbackStatus])
  @@index([consumerWalletId])
  @@map("receipts")
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 评分（通过 ERC-8004 Feedback 上链，tag1="starred"）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model Rating {
  id               String   @id @default(cuid())
  receiptId        String   @unique
  receipt          Receipt  @relation(fields: [receiptId], references: [id])
  agentId          String
  agent            Agent    @relation(fields: [agentId], references: [id])
  consumerWalletId String
  consumerWallet   Wallet   @relation(fields: [consumerWalletId], references: [id])

  score            Int                       // 1-5 星
  comment          String?                   // 评论内容

  // ── ERC-8004 Feedback 上链 ──
  feedbackStatus   String   @default("pending") // "pending"|"submitted"|"failed"
  feedbackTx       String?
  feedbackIpfsCid  String?
  retryCount       Int      @default(0)

  createdAt        DateTime @default(now())

  @@index([agentId])
  @@index([feedbackStatus])
  @@map("ratings")
}
```

---

## 六、DDL（SQLite 建表语句）

```sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- AgentHub DDL for SQLite (WAL mode)
-- 生成自 Prisma Schema，供直接参考
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRAGMA journal_mode = WAL;

-- 钱包身份
CREATE TABLE wallets (
    id           TEXT PRIMARY KEY,
    pubkey       TEXT NOT NULL UNIQUE,
    source       TEXT NOT NULL DEFAULT 'cli',
    createdAt    DATETIME NOT NULL DEFAULT (datetime('now')),
    lastLoginAt  DATETIME
);

-- 认证挑战
CREATE TABLE auth_challenges (
    id        TEXT PRIMARY KEY,
    wallet    TEXT NOT NULL,
    nonce     TEXT NOT NULL UNIQUE,
    used      INTEGER NOT NULL DEFAULT 0,
    expiresAt DATETIME NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_auth_challenges_wallet ON auth_challenges(wallet);
CREATE INDEX idx_auth_challenges_expires ON auth_challenges(expiresAt);

-- 管理员
CREATE TABLE admin_users (
    id           TEXT PRIMARY KEY,
    username     TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    createdAt    DATETIME NOT NULL DEFAULT (datetime('now')),
    lastLoginAt  DATETIME
);

-- Agent 定义
CREATE TABLE agents (
    id                TEXT PRIMARY KEY,
    providerWalletId  TEXT NOT NULL REFERENCES wallets(id),
    name              TEXT NOT NULL,
    description       TEXT NOT NULL,
    capabilityTags    TEXT NOT NULL,           -- JSON array
    skills            TEXT NOT NULL DEFAULT '[]', -- JSON array (ERC-8004)
    domains           TEXT NOT NULL DEFAULT '[]', -- JSON array (ERC-8004)
    priceUsdcMicro    INTEGER NOT NULL,
    endpointUrl       TEXT NOT NULL,
    inputSchema       TEXT,                    -- JSON, nullable
    outputFormat      TEXT,                    -- JSON, nullable
    model             TEXT,                    -- [deprecated]
    imageUrl          TEXT,                    -- [deprecated]
    status            TEXT NOT NULL DEFAULT 'pending_review',
    reviewNote        TEXT,
    reviewedAt        DATETIME,
    solAssetAddress   TEXT,
    ipfsCid           TEXT,
    ipfsUri           TEXT,
    solPublishTx      TEXT,
    chainStatus       TEXT NOT NULL DEFAULT 'none',
    registeredAt      DATETIME,
    ratingAvg         REAL NOT NULL DEFAULT 0,
    ratingCount       INTEGER NOT NULL DEFAULT 0,
    totalOrders       INTEGER NOT NULL DEFAULT 0,
    avgResponseTimeMs INTEGER NOT NULL DEFAULT 0,
    createdAt         DATETIME NOT NULL DEFAULT (datetime('now')),
    updatedAt         DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_chain ON agents(chainStatus);
CREATE INDEX idx_agents_provider ON agents(providerWalletId);

-- 报价
CREATE TABLE quotes (
    id               TEXT PRIMARY KEY,
    agentId          TEXT NOT NULL REFERENCES agents(id),
    consumerWalletId TEXT NOT NULL REFERENCES wallets(id),
    taskText         TEXT NOT NULL,
    amountUsdcMicro  INTEGER NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending',
    expiresAt        DATETIME NOT NULL,
    createdAt        DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_expires ON quotes(expiresAt);

-- 订单
CREATE TABLE orders (
    id               TEXT PRIMARY KEY,
    quoteId          TEXT NOT NULL UNIQUE REFERENCES quotes(id),
    agentId          TEXT NOT NULL REFERENCES agents(id),
    consumerWalletId TEXT NOT NULL REFERENCES wallets(id),
    status           TEXT NOT NULL DEFAULT 'pending',
    paymentTx        TEXT,
    paymentVerified  INTEGER NOT NULL DEFAULT 0,
    paymentPayer     TEXT,
    paymentAmount    INTEGER,
    paymentNetwork   TEXT,
    resultHash       TEXT,
    responseTimeMs   INTEGER,
    errorCode        TEXT,
    createdAt        DATETIME NOT NULL DEFAULT (datetime('now')),
    updatedAt        DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_agent ON orders(agentId);
CREATE INDEX idx_orders_consumer ON orders(consumerWalletId);

-- 收据
CREATE TABLE receipts (
    id               TEXT PRIMARY KEY,
    orderId          TEXT NOT NULL UNIQUE REFERENCES orders(id),
    agentId          TEXT NOT NULL REFERENCES agents(id),
    consumerWalletId TEXT NOT NULL REFERENCES wallets(id),
    receiptHash      TEXT NOT NULL,
    amountUsdcMicro  INTEGER NOT NULL,
    feedbackStatus   TEXT NOT NULL DEFAULT 'pending',
    feedbackTx       TEXT,
    feedbackIpfsCid  TEXT,
    retryCount       INTEGER NOT NULL DEFAULT 0,
    feedbackAt       DATETIME,
    createdAt        DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_receipts_feedback ON receipts(feedbackStatus);
CREATE INDEX idx_receipts_consumer ON receipts(consumerWalletId);

-- 评分
CREATE TABLE ratings (
    id               TEXT PRIMARY KEY,
    receiptId        TEXT NOT NULL UNIQUE REFERENCES receipts(id),
    agentId          TEXT NOT NULL REFERENCES agents(id),
    consumerWalletId TEXT NOT NULL REFERENCES wallets(id),
    score            INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
    comment          TEXT,
    feedbackStatus   TEXT NOT NULL DEFAULT 'pending',
    feedbackTx       TEXT,
    feedbackIpfsCid  TEXT,
    retryCount       INTEGER NOT NULL DEFAULT 0,
    createdAt        DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_ratings_agent ON ratings(agentId);
CREATE INDEX idx_ratings_feedback ON ratings(feedbackStatus);
```

---

## 七、结论

### 已覆盖

- ✅ 全部 10 个 Consumer/Provider Web 页面的数据需求
- ✅ 全部 5 个 Admin Web 页面的数据需求
- ✅ 全部 6 个 CLI 命令的数据需求
- ✅ 统一订单 type 字段（API 层计算，无需新增 DB 字段）
- ✅ 支付凭证 type 字段（API 层计算，无需新增 DB 字段）
- ✅ Dashboard 消费/收入统计（聚合查询，无需新增表）
- ✅ Admin Dashboard 平台统计（聚合 Agent/Order/Wallet/Receipt）
- ✅ Admin Users 页（Wallet 表 + 关联聚合，无 role 字段，无需新增 DB 字段）
- ✅ Admin Agent Review（Agent.status 筛选 + reviewNote 审批备注）
- ✅ Admin Failed Receipts（Receipt.feedbackStatus="failed" + retryCount）
- ✅ ERC-8004 skills/domains（Agent 表已有字段）
- ✅ x402 协议全链路（Order.payment* 字段群）
- ✅ 链上信息（Agent.sol* / Receipt.feedback* / Rating.feedback*）
- ✅ Admin 独立认证（AdminUser 表）

### 已弃用但保留

- ⚠️ `Agent.model` — 已从界面删除，DB 保留向后兼容
- ⚠️ `Agent.imageUrl` — 已从界面删除，DB 保留向后兼容

### 无需新增表/字段

当前 8 张业务表 + Prisma Schema 已完整覆盖所有界面需求（10 Consumer/Provider 页 + 5 Admin 页 + 6 CLI 命令），无需额外变更。Admin Users 页不区分 Consumer/Provider 角色，与 Wallet 表无 role 字段的设计一致——通过 Agent/Order 关联聚合展示用户数据。
