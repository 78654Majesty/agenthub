# Dev C 任务清单 — Plugin + Consumer Gateway API + Auth

> 分支: `dev-c/feature-v1`
> commit 前缀: `feat(dev-c):`
> 工作目录: `agenthub-plugin/`（Plugin） + `agenthub-gateway/`（Gateway 部分）
> 当前阶段文档: [dev-c-ah-connect-minimal.md](./dev-c/dev-c-ah-connect-minimal.md)
> 下一阶段文档: [dev-c-claude-plugin-wrapper-minimal.md](./dev-c/dev-c-claude-plugin-wrapper-minimal.md)

## 当前实施范围（最小路径）

当前阶段已经从 `ah:connect` 扩到 `ah:run` 的真实最小闭环，但仍然只做 Dev C 可独立推进的部分，不展开到 Rating、Dashboard、Wallet Bridge HTTP 服务、本地 HTTP Bridge 服务和完整交易解析。

### 当前最小路径目标

- Plugin 以 MCP stdio 方式启动
- `wallet_connect` tool 可调用
- `wallet_status` tool 可调用
- `wallet_faucet` tool 可调用，用于 Solana devnet SOL 和可配置 USDC faucet
- 本地创建或加载开发态钱包文件
- 调 Gateway `public-auth` 完成 challenge / verify
- Plugin 在内存中缓存 JWT
- Gateway 提供受保护 `consumer/match`
- Plugin 可通过 `match_capability` 调用受保护 `consumer/match`
- Plugin 可执行 `run_agent_task` 最小闭环
- Claude 插件提供 `/agenthub:faucet` command 编排 `wallet_status`、`wallet_faucet`
- Claude 插件提供 `/agenthub:run` command 编排 `wallet_status`、`match_capability`、`run_agent_task`
- Gateway 可接收 `consumer/receipts` 最小回执上报
- Dev C 通过 Gateway 主进程（`pnpm start:dev`）完成 `public-auth` 联调验证，不再维护独立 `public-auth` 开发服务器

### 当前非范围

- `wallet_status` 的真实余额查询
- `wallet_export`
- Wallet Bridge `localhost:8090` HTTP 服务形态
- AES-256-GCM 钱包加密存储
- `ah:receipt` / `ah:dashboard`
- Consumer Receipt 查询 / Rating 路由
- 完整 x402 交易金额、USDC mint、payee 精确解析
- 内置公开 USDC faucet 服务；当前 USDC 领取由 Gateway 持有 `AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY` 签名转账，Plugin 通过 Gateway 受保护接口调用

### 当前实现说明

- 当前产品路径使用进程内 Wallet Bridge SDK，不要求用户启动或配置 `localhost:8090` 本地服务
- 当前钱包层已从直接文件读写收敛为 SDK 抽象，供 `wallet_connect` / `wallet_status` 复用
- Auth 使用真实 challenge + 签名 + JWT 链路
- `match` 已明确收敛为 Consumer 受保护接口，不再放在 public 域
- `run_agent_task` 默认使用真实 SVM x402 client；`AGENTHUB_X402_MODE=mock` 仅作为本地开发回退
- `consumer/receipts` 当前按黑客松最小闭环收敛为“只落库”：不再调用链上校验 tx / payer / amount，当前仅在 JWT 已通过前提下校验 Wallet / Agent 存在并写入 Quote / Order / Receipt，`payment_verified` 返回 `false`
- `wallet_faucet` 当前 SOL 使用 Solana devnet RPC，USDC 由 Gateway 持有 faucet wallet 私钥签名转账；未配置 `AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY` 时返回 skipped，不伪造 USDC 到账
- Plugin 不再包含本地 faucet wallet 实现，`wallet_faucet` 只调用 Gateway 受保护接口
- 为了符合 AGENTS 的文档要求，实施时需同步更新 `feature_list.json`、`docs/progress/dev-c.md` 和相关 API 文档
- 当前阶段已补到 Dev C 本地联调闭环；下一阶段收敛在“Claude 插件壳 + MCP 内核”最小闭环，首个验收宿主为 Claude Code
- 当前已补正式启动入口 `npm run start` 与 Claude Code MCP 配置生成命令 `npm run claude:config`

---

## 独占目录

**Gateway 部分 (`agenthub-gateway/`):**
```
apps/gateway/src/routes/public-auth/
apps/gateway/src/routes/consumer/
apps/gateway/src/services/auth.service.ts
apps/gateway/src/services/match.service.ts
apps/gateway/src/services/consumer/
packages/types/src/consumer.ts
apps/gateway/src/lib/errors/consumer.ts
```

**Plugin 全部 (`agenthub-plugin/`):**
```
agenthub-plugin/src/              ← 整个目录独占
```

---

## 开发顺序建议

1. Gateway Auth 路由（其他 Dev 的鉴权依赖这些路由的数据写入）
2. Gateway Consumer 路由（Plugin 的上报目标）
3. Plugin 骨架（MCP Server + Wallet Bridge）
4. Plugin Tools 实现（逐个 tool 对接 Gateway）
5. Plugin Skills（Markdown 命令引导）

---

## 任务列表

### Gateway 部分

#### C-1: 类型定义 + 错误码

- [ ] `packages/types/src/consumer.ts`：
  - ChallengeResponse, VerifyRequest/Response
  - MatchRequest/Response, AgentMatch
  - CreateReceiptRequest/Response
  - CreateRatingRequest
  - ReceiptDetail, ReceiptOnChain
- [ ] `lib/errors/consumer.ts`：NO_MATCH, INVALID_TX, TX_NOT_FOUND, AMOUNT_MISMATCH, PAYER_MISMATCH, RECEIPT_NOT_FOUND, RECEIPT_ALREADY_RATED, NOT_YOUR_RECEIPT

**验证**: TypeScript 编译通过

---

#### C-2: Gateway — Auth Challenge + Verify

- [ ] `services/auth.service.ts`：
  - `generateChallenge(walletPubkey)` — 调 auth 包 `generateChallenge()`，创建 AuthChallenge 记录，返回 { nonce, message, expires_at }
  - `verifySignature(wallet, signature)` — 查 AuthChallenge(nonce, wallet, !used, !expired)，调 auth 包 `verifyWalletSignature()`，标记 used=true，upsert Wallet 记录，调 auth 包 `signJwt({ wallet_pubkey })`
- [ ] `routes/public-auth/index.ts`：
  - GET /challenge?wallet={pubkey} — 返回 `{ nonce, message, expires_at }` 或 `{ challenge, expires_in }` (兼容两种格式)
  - POST /verify — Body `{ wallet, signature }`，返回 `{ token, wallet_pubkey, expires_in }`

**最小路径当前状态**:
- [x] 已实现真实 challenge 生成
- [x] 已实现真实签名校验
- [x] 已实现 JWT 签发
- [x] 已移除 `dev:public-auth` 独立联调入口，统一走 Gateway canonical 路由
- [x] 已接入 Gateway 主服务 canonical 路由验证

---

#### C-3: Gateway — 能力匹配 `POST /v1/consumer/match`

- [x] `services/match.service.ts`：
  - `matchAgent(task, maxPriceUsdc?, tags?)` —
    1. 查 Agent WHERE status=active，可选 WHERE priceUsdcMicro <= maxPrice，可选 WHERE capabilityTags LIKE tags
    2. 如果 ANTHROPIC_API_KEY 存在：调 Claude API (claude-sonnet) rerank，返回 top + alternatives + reason
    3. 如果无 API key：按 ratingAvg DESC 取 top 1 + 其余 alternatives
- [x] 当前最小实现已落在受保护 `POST /v1/consumer/match`，不再放在 public 域
- [x] 默认从 Prisma 读取 active Agents，返回 `{ top, alternatives, reason }` 最小结构；当前为 fallback 排序实现，未接 Claude rerank

**注意**: 如果单独建 `routes/public-match/`，需确认 route-loader 能自动扫描到

---

#### C-4: Gateway — Receipt 上报 `POST /v1/consumer/receipts`

- [x] `services/consumer/index.ts`：
  - `createReceipt(walletId, data)` —
    1. 当前已实现：不做链上交易校验，直接进入落库路径
    2. 当前已实现：返回 `receiptId` / `orderId` / `paymentVerified=false` / `explorerLink`
    3. 当前已实现：创建 Quote / Order / Receipt，并更新 Agent `totalOrders`
    4. 当前待补：Provider 钱包、USDC mint、链上金额、payee 精确校验
- [x] `routes/consumer/index.ts`：POST /receipts，需 verifyWalletJwt
- [x] 当前返回 `{ receipt_id, order_id, payment_verified, explorer_link? }`
- [x] 默认写入 Quote / Order / Receipt，并更新 Agent `totalOrders`

---

#### C-5: Gateway — Consumer Receipt 查询

- [ ] `services/consumer/index.ts`：
  - `getReceipt(walletId, receiptId)` — 验证所有权 + JOIN Order/Agent
  - `getReceiptOnChain(receiptId)` — 返回 feedbackTx, feedbackIpfsCid, feedbackStatus
- [ ] `routes/consumer/index.ts`：
  - GET /receipts/:id — 需 verifyWalletJwt
  - GET /receipts/:id/on-chain — 需 verifyWalletJwt

---

#### C-6: Gateway — 评分 `POST /v1/consumer/ratings`

- [ ] `services/consumer/index.ts`：
  - `createRating(walletId, receiptId, score, comment?)` —
    1. 验证 Receipt 存在且属于当前钱包
    2. 验证 Receipt 未评分（Rating 不存在）
    3. 创建 Rating (feedbackStatus=pending)
    4. 更新 Agent.ratingAvg 和 ratingCount（增量重算）
- [ ] `routes/consumer/index.ts`：POST /ratings，需 verifyWalletJwt

---

### Plugin 部分

#### C-7: Plugin 项目初始化

- [ ] `package.json`：依赖 `@modelcontextprotocol/sdk`, `@x402/fetch`, `@solana/web3.js`
- [ ] `tsconfig.json`：target ES2022, module NodeNext
- [ ] `src/index.ts`：MCP Server stdio 入口，注册所有 tools
- [ ] 验证 `npm run build` + stdio 模式启动

**最小路径当前状态**:
- [x] `src/index.ts` 已按 stdio 启动 MCP Server
- [x] 已注册 `wallet_connect`
- [x] `agenthub-plugin` 本地 `npm run build` 已覆盖
- [x] 已提供 `smoke:connect` 本地联调入口

---

#### C-8: Plugin — Wallet Bridge SDK

- [x] `src/wallet-bridge/index.ts`：当前作为进程内 Wallet Bridge SDK 统一导出入口，不启动 HTTP 服务
- [x] `src/wallet-bridge/sdk.ts`：封装 connect / status / signMessage / getSvmSigner
- [ ] `src/wallet-bridge/wallet.ts`：keypair 管理
  - 生成新 keypair 或从文件加载
  - 当前开发态存储路径：`~/.agenthub/dev-wallet.json`，可用 `AGENTHUB_WALLET_PATH` 覆盖
  - 待补：AES-256-GCM 加密存储（密码来自环境变量或用户输入）

**最小路径当前状态**:
- [x] 当前正式插件路径不要求手动 setup，Claude Code 通过插件内置 `.mcp.json` 自动加载本地 MCP runtime
- [x] 已实现进程内 Wallet Bridge SDK 抽象，作为 `wallet_connect` / `wallet_status` / `run_agent_task` 的当前承载层
- [ ] 完整 Wallet Bridge 本地 HTTP 服务暂不做，后续只有在 Web Dashboard 或跨进程签名确实需要时再立项

---

#### C-9: Plugin — Gateway Client

- [ ] `src/gateway-client.ts`：Gateway REST 调用封装
  - `challenge(pubkey)` → GET /v1/public/auth/challenge
  - `verify(wallet, signature)` → POST /v1/public/auth/verify → 存储 JWT
  - [x] `matchAgent(task, options)` → POST /v1/consumer/match
  - `listAgents(params)` → GET /v1/public/market/agents
  - [x] `submitReceipt(data)` → POST /v1/consumer/receipts
  - `submitRating(receiptId, score, comment)` → POST /v1/consumer/ratings
  - `getReceipt(id)` → GET /v1/consumer/receipts/:id
- [ ] JWT 自动注入 Authorization header
- [x] Gateway URL 从环境变量 `AGENTHUB_GATEWAY_URL` 读取；当前默认值已收敛为本地 `http://127.0.0.1:8080`，远端环境再通过环境变量覆盖

---

#### C-10: Plugin — x402 Client

- [x] `src/x402-client.ts`：当前已实现 mock x402 调用封装
  - `executeWithPayment(endpointUrl, task, signerFn)` —
    1. 已实现 mock 返回 `{ result, txSignature, payer, amount, network }`
    2. 已实现真实 `@x402/fetch` 包装请求与 `PAYMENT-RESPONSE` 解码
- [x] 已通过 Wallet Bridge SDK `getSvmSigner()` 对接 `@x402/svm` client signer
- [ ] 暂不实现 Wallet Bridge `/sign-tx` 本地 HTTP 服务形态；当前真实 x402 使用进程内 SDK signer
- [ ] 尚未完成真实 Provider endpoint 端到端联调

---

#### C-11: Plugin — MCP Tool: wallet_connect

- [ ] `src/tools.ts`：注册 `wallet_connect` tool
- [ ] 流程：
  1. 调用进程内 Wallet Bridge SDK connect → 获取 pubkey
  2. 调用 Gateway Client `challenge(pubkey)` → 获取 nonce + message
  3. 调用进程内 Wallet Bridge SDK signMessage → 签名 message
  4. 调用 Gateway Client `verify(pubkey, signature)` → 获取 JWT
  5. 存储 JWT 到内存
- [ ] 返回 `{ pubkey, balance_usdc, network: "solana:devnet", is_new }`

**最小路径当前状态**:
- [x] 已实现 `wallet_connect`
- [x] 已完成 challenge -> sign -> verify -> JWT cache
- [x] 当前返回包含最小字段：`walletPubkey`, `tokenCached`, `network`, `isNew`
- [ ] 余额查询仍待补充

---

#### C-12: Plugin — MCP Tool: wallet_status + wallet_export

- [x] `wallet_status`：当前通过进程内 Wallet Bridge SDK 返回最小状态
- [ ] `wallet_export`：调用 Wallet Bridge GET /export，返回 `{ pubkey, secret_key_base58, warning: "Never share..." }`

---

#### C-12.5: Plugin — MCP Tool: wallet_faucet

- [x] `wallet_faucet`：为当前登录钱包领取 Solana devnet 测试资产
  - SOL：通过 Solana devnet RPC `requestAirdrop`
  - USDC：通过 Gateway 受保护接口 `POST /v1/consumer/faucet` 领取，Gateway 持有 `AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY` 签名转账
  - Gateway 未配置 faucet 私钥时，只领取 SOL 并返回 skipped warning
- [x] `commands/faucet.md`：提供 `/agenthub:faucet` Claude command
- [x] `plugin.json`：注册 `./commands/faucet.md`

---

#### C-13: Plugin — MCP Tool: market_list

- [ ] 调用 Gateway Client `listAgents(params)` — 支持 tags/max_price_usdc/sort
- [ ] 格式化返回：Agent 列表（名称 + 价格 + 评分 + 标签 + 链上状态标记）

---

#### C-14: Plugin — MCP Tool: match_capability + run_agent_task

- [x] `match_capability`：调用 Gateway Client `matchAgent(task, options)` → 返回 top + alternatives + reason
- [x] `run_agent_task`：
  1. 验证钱包已连接（有 JWT）
  2. 调用 x402 Client `executeWithPayment(endpoint_url, payload)`；默认真实 SVM x402 client，`AGENTHUB_X402_MODE=mock` 时使用本地 mock fallback
  3. 从返回中提取 { result, txSignature, payer, amount, network }
  4. 计算 result_hash = SHA256(result)，object result 使用稳定 JSON
  5. 调用 Gateway Client `submitReceipt({ agent_id, task_text, tx_signature, payer, amount, network, result_hash })`
  6. receipt 成功时返回 `{ result, receipt_id, tx_signature, explorer_link }`；receipt 失败时仍返回 `{ result, tx_signature, receipt_error }`

**注意**: 当前已支持 Weather Agent `{ city }` payload 和真实 x402 默认路径；完整验收仍依赖真实 x402 Agent、devnet USDC faucet 和本地 Prisma 数据库。

---

#### C-15: Plugin — MCP Tool: get_receipt + rate_agent + open_dashboard

- [ ] `get_receipt`：调用 Gateway Client `getReceipt(receipt_id)` → 格式化展示
- [ ] `rate_agent`：调用 Gateway Client `submitRating(receipt_id, score, comment)`
- [ ] `open_dashboard`：
  1. 获取当前 JWT
  2. 拼接 URL `${GATEWAY_WEB_URL}/dashboard?token=${jwt}`
  3. 调用 `open` 包打开系统浏览器

---

#### C-16: Plugin — Skills (Markdown 命令引导)

- [x] 验证已有 skill / command 文件与实际 tool 名称对应：
  - `skills/connect.md` → `wallet_connect`
  - `skills/run.md` → `wallet_status` → `match_capability` → 确认 → `run_agent_task` → 可选 `rate_agent`
  - `commands/connect.md` → `wallet_connect`
  - `commands/faucet.md` → `wallet_status` → `wallet_faucet`
  - `commands/run.md` → `wallet_status` → `match_capability` → 确认 → `run_agent_task`
  - `skills/market.md` → `market_list`
  - `skills/dashboard.md` → `open_dashboard`
  - `skills/receipt.md` → `get_receipt`
  - `skills/help.md` → 纯文本输出
- [x] 当前已更新 `/agenthub:connect`、`/agenthub:faucet` 和 `/agenthub:run` 对应 command 内容；其余未实现 tools 的 command 暂不暴露

---

## 跨项目联调要点

| Plugin 调用 | Gateway 端点 | Owner | 注意事项 |
|-------------|-------------|-------|---------|
| wallet_connect | /v1/public/auth/* | Dev C (自己) | P1 mock auth，P2 真实签名 |
| market_list | /v1/public/market/agents | Dev A | 确认返回格式一致 |
| match_capability | /v1/consumer/match | Dev C (自己) | Claude API key 可选 |
| wallet_faucet | `/v1/consumer/faucet` POST（受保护）+ Solana devnet RPC | Dev C (自己) | SOL 走 devnet RPC，USDC 由 Gateway 持有 faucet wallet 私钥签名转账 |
| run_agent_task | x402 Agent endpoint | 外部 | 需至少 1 个测试 x402 Agent |
| submitReceipt | /v1/consumer/receipts POST | Dev C (自己) | 当前验证 tx 存在且 confirmed/finalized，收敛 expected payment 接口并校验 amount 与 agent price 一致，然后写入 Quote / Order / Receipt |
| submitRating | /v1/consumer/ratings POST | Dev C (自己) | 验证 receipt 所有权 |
| getReceipt | /v1/consumer/receipts/:id | Dev C (自己) | — |
| open_dashboard | Web /dashboard?token=xxx | Dev B | 验证 token 免登录跳转 |

---

## 验收标准

### Gateway

1. **Auth 流程** challenge → verify → JWT 颁发，AuthChallenge 正确创建/标记已用
2. **Match 路由** 返回 top Agent + alternatives + reason
3. **Receipt 上报** 创建 Quote + Order + Receipt 三条记录，Agent 统计更新
4. **Rating 提交** 创建 Rating + Agent ratingAvg/ratingCount 更新
5. **所有路由** curl 返回格式与 api-dependencies 文档一致

### Plugin

1. **ah:connect** 创建钱包 + Gateway 认证 + 显示余额
2. **ah:faucet** 为新钱包领取 devnet SOL，并在配置 USDC faucet 时领取 devnet USDC
3. **ah:market** 展示 Agent 列表
4. **ah:run** 完整流程：match → 确认 → x402 支付 → Receipt → 可选评分
5. **ah:dashboard** 打开浏览器跳转 Web Dashboard
6. **ah:receipt** 查询 Receipt 详情
7. **Wallet Bridge** 加密存储 + 签名功能正常

---

*最后更新: 2026-04-21*
