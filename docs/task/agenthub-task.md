# AgentHub 功能点与任务清单（重生成）

> 文档版本: v1.0
> 文档状态: 草稿
> 创建日期: 2026-04-21
> 更新日期: 2026-04-21
> 依据文档:
> - `docs/spec/agenthub-spec-v1.md`
> - `docs/spec/api-dependencies-web-pages.md`
> - 首页原型: `D:\ai开发\agenthub-design-v2\V9 Unauth Home - Modern Light.png`

---

## 一、AgentHub 功能点（Feature List）

### F-01 未登录首页（/）
- 顶部导航：Logo、Marketplace、Docs、Trust、Blog、Connect Wallet、Become Provider。
- Hero 区：品牌主张文案、任务输入框、`Match Agent` 语义匹配入口。
- 平台统计：展示 `total_agents`、`total_providers`、`total_orders`、`avg_rating`。
- Featured Agents：展示精选 Agent（评分优先），支持 Verified/Liveness 视觉标识。
- 分类快捷入口：Security、DeFi、Data、Code、NLP 等标签跳转 Marketplace。
- Trust Flow：展示 “提交-审核-注册-支付-反馈” 的链路说明。
- Footer：平台/链上/社区链接。
- 数据策略：Stats + Featured SSR，支持 ISR；失败降级不阻塞首屏。

### F-02 Agent Marketplace（/marketplace）
- 列表浏览：3x3 卡片展示（名称、描述、标签、价格、评分、调用量、状态）。
- 搜索筛选：关键词、标签、价格区间、状态筛选。
- 排序分页：rating/price/newest/calls，支持 page + limit。
- URL 状态同步：筛选参数与 query params 双向同步，可分享。
- 链上信息补充：按需加载 on-chain 状态，失败时降级隐藏 badge。

### F-03 Marketplace 详情页（/marketplace/[id]）
- 基础详情：名称、描述、tags、price、provider 信息。
- 链上身份：asset address、IPFS metadata、creator、owner、chain_status、8004scan 外链。
- 声誉信息：评分汇总、反馈数量、评分趋势。
- Feedback 列表：tag1/tag2/value/ipfs_cid/tx_signature/created_at。
- Liveness 状态：live/partial/not_live。

### F-04 钱包认证与会话
- 钱包挑战签名登录：challenge + verify，签发 JWT。
- Web 认证态：cookie 持久化，受保护路由校验。
- CLI 到 Web 免登录跳转：URL token 注入 cookie（dashboard 场景）。

### F-05 统一用户 Dashboard（Consumer + Provider）
- 概览卡：消费、收入、Agent 数、评分等聚合指标。
- Recent Orders：近期订单摘要。
- My Agents 快览：我的 Agent 概览入口。
- 统一侧边栏：MY ACCOUNT + PROVIDER 分组。

### F-06 Provider Agent 管理（/dashboard/agents*）
- 我的 Agent 列表：搜索、状态筛选（All/Active/Pending/Rejected）。
- 新建 Agent：Basic、x402 Endpoint、ERC-8004 分类、可选 API Schema。
- Agent 详情：配置、统计、链上身份、状态、可编辑信息。
- Agent 编辑与重提：PATCH 更新、受状态机约束。

### F-07 Provider 评分中心（/dashboard/ratings）
- 总评分卡片：平均分、总评价数、链上标识。
- 评分分布图：1-5 星分布。
- 评论列表：consumer、agent、评分、评论、链上 TX。
- 支持 Agent 维度筛选 + 分页。

### F-08 Provider 订单与收入
- Provider 订单列表：按状态/Agent/分页查询。
- Provider Dashboard 聚合：收入、订单数、Agent 数、平均评分。

### F-09 Admin 管理系统（/admin/*）
- Admin 登录：账号密码 + Session JWT。
- Admin Dashboard：平台统计、最近提交、失败收据。
- Agent 审核：approve/reject/suspend。
- 失败收据处理：失败列表 + 手动 retry。
- 用户列表：钱包维度聚合（agents/orders/spending/revenue）。

### F-10 Gateway 公共市场 API
- `GET /v1/public/market/stats`
- `GET /v1/public/market/agents`
- `GET /v1/public/market/agents/:id`
- `GET /v1/public/market/agents/:id/on-chain`
- `GET /v1/public/market/agents/:id/feedbacks`
- `POST /v1/public/match`

### F-11 Gateway Provider API
- `POST /v1/provider/agents`
- `GET /v1/provider/agents`
- `GET /v1/provider/agents/:id`
- `PATCH /v1/provider/agents/:id`
- `GET /v1/provider/ratings`
- `GET /v1/provider/ratings/distribution`
- `GET /v1/provider/orders`
- `GET /v1/provider/dashboard`

### F-12 共享类型、错误码、数据模型
- 类型定义：market/provider/consumer/admin/common。
- 错误码体系：auth/market/provider/consumer/admin。
- 数据模型：Wallet、Agent、Order、Receipt、Rating、Challenge、AdminUser 等。

### F-13 链上与支付能力
- ERC-8004：Agent 注册、链上身份查询、反馈提交、反馈读取、存活检测。
- IPFS：Agent metadata 与 feedback detail 上链前存储。
- x402：Consumer 直接向 Agent 支付，Gateway 做交易验证与记录。

### F-14 Worker 与异步任务
- Feedback Worker：轮询 pending 的 receipt/rating 并上链。
- 重试策略：指数退避、失败标记、可被 Admin 重试补偿。

### F-15 质量与可运维能力
- 文档一致性：接口响应与 `api-dependencies-web-pages.md` 对齐。
- 监控与日志：关键链路可追踪（match、pay、verify、register、feedback）。
- 部署：Docker Compose 一键启动 gateway + web。

---

## 二、AgentHub Task（可执行任务重排）

### 2.1 任务总览

| 任务ID | 模块 | 优先级 | 负责人建议 | 前置依赖 |
|---|---|---|---|---|
| TASK-INFRA-001 | 基建与仓库初始化 | 高 | Infra | 无 |
| TASK-INFRA-002 | Prisma Schema + Seed | 高 | Infra | TASK-INFRA-001 |
| TASK-INFRA-003 | 认证中间件与错误框架 | 高 | Infra | TASK-INFRA-001 |
| TASK-API-MARKET-001 | Public Market API | 高 | Dev A | TASK-INFRA-002 |
| TASK-API-PROVIDER-001 | Provider API | 高 | Dev A | TASK-INFRA-002,003 |
| TASK-WEB-HOME-001 | 首页接入真实数据 | 高 | Dev A | TASK-API-MARKET-001 |
| TASK-WEB-MARKET-001 | Marketplace 列表页 | 高 | Dev A | TASK-API-MARKET-001 |
| TASK-WEB-MARKET-002 | Marketplace 详情页 | 高 | Dev A | TASK-API-MARKET-001 |
| TASK-WEB-PROVIDER-001 | Provider Agent 页面 | 高 | Dev A | TASK-API-PROVIDER-001 |
| TASK-WEB-PROVIDER-002 | Provider Ratings 页面 | 中 | Dev A | TASK-API-PROVIDER-001 |
| TASK-API-CONSUMER-001 | User Dashboard/Orders/Receipts API | 高 | Dev B | TASK-INFRA-003 |
| TASK-WEB-CONSUMER-001 | 统一 Dashboard/Orders/Receipts | 高 | Dev B | TASK-API-CONSUMER-001 |
| TASK-API-ADMIN-001 | Admin API 全链路 | 高 | Dev B | TASK-INFRA-003 |
| TASK-WEB-ADMIN-001 | Admin 页面全链路 | 高 | Dev B | TASK-API-ADMIN-001 |
| TASK-AUTH-PLUGIN-001 | 钱包认证 + Plugin 鉴权链路 | 高 | Dev C | TASK-INFRA-003 |
| TASK-CHAIN-001 | ERC-8004 与 IPFS 真实实现 | 高 | Infra | TASK-INFRA-002 |
| TASK-WORKER-001 | Feedback Worker 真实实现 | 高 | Infra | TASK-CHAIN-001 |
| TASK-E2E-001 | 联调与验收 | 高 | 全员 | 上述任务基本完成 |

### 2.2 任务详情

#### TASK-INFRA-001 基建与仓库初始化
- 目标：完成 workspace、构建脚本、目录骨架、运行入口。
- 技术要求：pnpm workspace、gateway/web 启动脚本、路由自动加载。
- 交付物：`package.json`、`pnpm-workspace.yaml`、`apps/gateway/src/index.ts`、`apps/gateway/src/lib/route-loader.ts`。
- 验收：本地可分别启动 gateway(8080) 与 web(3000)。

#### TASK-INFRA-002 Prisma Schema + Seed
- 目标：落地 MVP 全量核心表与初始化数据。
- 技术要求：Schema 对齐 `docs/schema/database-design.md`；seed 覆盖 admin/wallet/agent/order/receipt/rating。
- 交付物：`prisma/schema.prisma`、`prisma/seed.ts`。
- 验收：`prisma db push` 与 seed 执行成功，关键页面有可展示数据。

#### TASK-INFRA-003 认证中间件与错误框架
- 目标：统一认证拦截与标准错误返回。
- 技术要求：钱包 JWT、admin session、模块化错误码。
- 交付物：`middleware/*`、`lib/errors/*`。
- 验收：受保护路由未认证时返回一致错误或跳转。

#### TASK-API-MARKET-001 Public Market API
- 目标：完成首页 + marketplace + 详情依赖接口。
- 子项：stats、agents list/detail、on-chain、feedbacks、match。
- 交付物：`routes/public-market/`、`services/market/`、`packages/types/src/market.ts`、`lib/errors/market.ts`。
- 验收：curl 返回结构与 `api-dependencies-web-pages.md` 一致。

#### TASK-API-PROVIDER-001 Provider API
- 目标：完成 Provider Agent CRUD、ratings、orders、dashboard。
- 子项：所有权校验、状态机校验、价格单位处理。
- 交付物：`routes/provider/`、`services/provider/`、`packages/types/src/provider.ts`、`lib/errors/provider.ts`。
- 验收：创建-列表-详情-编辑闭环可用。

#### TASK-WEB-HOME-001 首页接入真实数据
- 目标：按 `V9 Unauth Home - Modern Light` 完成真实数据首页。
- 子项：SSR stats、SSR featured、Match Agent 交互、ISR 300s、错误降级。
- 交付物：`apps/web/src/app/page.tsx`、首页相关组件。
- 验收：首页不再依赖静态假数据，接口失败时页面可正常渲染。

#### TASK-WEB-MARKET-001 Marketplace 列表页
- 目标：完成完整的搜索/筛选/排序/分页体验。
- 子项：SSR 首屏 + CSR 交互、URL 参数同步、on-chain badge 按需加载。
- 交付物：`app/marketplace/page.tsx`、`components/marketplace/*`、`lib/api/market.ts`。
- 验收：筛选项可分享且浏览器前进/后退状态正确。

#### TASK-WEB-MARKET-002 Marketplace 详情页
- 目标：完成 Agent 全量详情展示与链上信息可视化。
- 子项：基础信息、on-chain 身份、声誉与 feedback、liveness。
- 交付物：`app/marketplace/[id]/page.tsx`。
- 验收：详情页数据完整，链上请求失败有降级方案。

#### TASK-WEB-PROVIDER-001 Provider Agent 页面
- 目标：完成 `/dashboard/agents`、`/dashboard/agents/new`、`/dashboard/agents/[id]`。
- 子项：创建表单、编辑、重提、状态 badge、侧边栏高亮。
- 交付物：`app/dashboard/agents/**`、`components/provider/*`、`lib/api/provider.ts`。
- 验收：Provider Agent 管理全流程可用。

#### TASK-WEB-PROVIDER-002 Provider Ratings 页面
- 目标：完成 `/dashboard/ratings` 的评分运营视图。
- 子项：总评分卡、分布图、列表、分页、agent 筛选。
- 交付物：`app/dashboard/ratings/page.tsx`。
- 验收：分布与列表数据与 API 对齐。

#### TASK-API-CONSUMER-001 User 侧 API
- 目标：完成 `/v1/user/dashboard`、`/v1/user/orders`、`/v1/user/receipts`。
- 验收：统一 Dashboard 与订单、收据页面接口满足前端依赖。

#### TASK-WEB-CONSUMER-001 User 侧页面
- 目标：完成 `/dashboard`、`/dashboard/orders`、`/dashboard/receipts`。
- 验收：JWT 有效时可访问，统计与列表渲染正确。

#### TASK-API-ADMIN-001 Admin API
- 目标：完成 admin 登录、统计、审核、失败补偿、用户聚合查询。
- 验收：审批与失败重试链路可闭环。

#### TASK-WEB-ADMIN-001 Admin 页面
- 目标：完成 `/admin/login`、`/admin/dashboard`、`/admin/agents`、`/admin/receipts`、`/admin/users`。
- 验收：admin 会话与页面权限隔离正确。

#### TASK-AUTH-PLUGIN-001 钱包认证 + Plugin 鉴权链路
- 目标：打通钱包 challenge/verify、CLI 侧 JWT 使用、`ah:dashboard` 免登录跳转。
- 验收：CLI 跳转 Web 可直接进入 dashboard。

#### TASK-CHAIN-001 ERC-8004 + IPFS
- 目标：实现 agent 注册、查询、feedback 提交、liveness 检测。
- 验收：可在链上浏览器查看资产与反馈记录。

#### TASK-WORKER-001 Feedback Worker
- 目标：实现 pending feedback 异步上链与失败重试。
- 验收：pending 记录可自动转 submitted；失败记录可重试。

#### TASK-E2E-001 联调与验收
- 目标：完成核心 demo 链路与回归验证。
- 子项：CLI `ah:run`、Web 首页/marketplace/provider/admin 全链路。
- 验收：关键用例通过，文档与实现一致。

---

## 三、阶段计划建议

### P0（1-2 天）
- 基建、Schema、认证框架、错误码、类型包。

### P1（2-4 天）
- Public Market + Provider API、首页与 Marketplace、Provider 页面。

### P2（2-3 天）
- Consumer/Admin、ERC-8004/IPFS/x402 真实链路、Worker。

### P3（1-2 天）
- 联调、修复、验收、Demo 打磨。

---

## 四、统一验收标准

1. 所有接口响应结构与 `docs/spec/api-dependencies-web-pages.md` 一致。
2. 首页符合 `V9 Unauth Home - Modern Light` 的信息架构与关键交互。
3. Marketplace 支持搜索/筛选/排序/分页/URL 同步。
4. Provider Agent CRUD 与 Ratings 流程闭环。
5. Admin 审核、失败收据重试、用户聚合查询可用。
6. 至少 1 个真实 Agent 完成 x402 支付调用 + ERC-8004 链上身份与反馈可验证。
7. 关键页面具备错误降级，不因单点接口失败导致白屏。

---

## 五、风险与应对

- 链上与 IPFS 不稳定：提供 mock/fallback + retry + admin 补偿入口。
- 多人并行冲突：坚持目录独占、共享文件走评审。
- 文档与实现偏移：每个里程碑后执行接口对表核对。
- 性能与体验：SSR + ISR + 客户端增量请求结合，保证首屏与交互速度。

---

*最后更新: 2026-04-21*
