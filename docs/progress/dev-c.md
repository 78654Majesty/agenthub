# AgentHub Dev C 角色进度日志

## 最后更新时间
2026-04-24

## 当前会话
- **日期**: 2026-04-23
- **主要任务**: 收敛 Dev C 当前产品路径，完成 `/agenthub:connect -> /agenthub:faucet -> /agenthub:run` 真实最小闭环整理，并清理历史 setup / Wallet Bridge HTTP 遗留内容
- **完成内容**:
  - 重新确认当前仓库文档根已迁移到 `docs/spec/`、`docs/task/`、`docs/rules/`，旧路径 `docs/agenthub-spec-v1.md` 不再使用
  - 对齐 `docs/rules/team-roles.md`、`docs/task/dev-c-plugin-auth.md` 与 `docs/spec/agenthub-spec-v1.md` 中关于 Dev C 的职责描述
  - 明确 Dev C 负责范围为 `agenthub-plugin/` 全部、Gateway `public-auth`、Gateway `consumer`、`auth.service.ts`、`match.service.ts`、`services/consumer/`、`types/consumer.ts`、`errors/consumer.ts`
  - 明确 Consumer 模块前后端边界：Dev C 负责 Consumer 统一后端接口服务，Dev B 只负责 Consumer Web 页面与前端 API client，不负责 Gateway `routes/consumer/` / `services/consumer/` 实现
  - 明确 Plugin 形态：`agenthub-plugin` 是本地 MCP Server 进程，通过 stdio 与 Claude Code 通信；当前 `wallet-bridge` 是进程内钱包 SDK，不再作为 `localhost:8090` HTTP 服务推进
  - 梳理 Consumer CLI 指令的数据流：`ah:connect`、`ah:market`、`ah:run`、`ah:receipt`、`rate_agent`、`ah:dashboard`
  - 明确每条 CLI 主链路涉及的内部组件、外部服务与通信协议（MCP stdio / localhost HTTP / REST API / x402 HTTP 402 / Solana JSON-RPC / 浏览器 URL 跳转）
  - 确认 `match` 的产品口径已调整为“登录后 run 的内部步骤”，不再视为纯 public browse；后续文档和接口应收敛为 Consumer 受保护匹配接口
  - 明确 `ah:connect` 负责“创建或加载本地钱包并登录”，`ah:dashboard` 负责“携带当前 token 跳转到 Web Dashboard”
  - 记录当前环境校验结果：本次在 Windows PowerShell 中执行 `./init.sh` 返回成功
  - 为 `agenthub-plugin` 补充 MCP stdio 启动入口和 `wallet_connect` 最小实现
  - 实现 Gateway `public-auth` 的 challenge / verify 最小认证链路
  - 使用开发态本地钱包文件替代完整 Wallet Bridge，先收敛在 `ah:connect`
  - 新增 `ah:connect` 相关测试，验证 Plugin 侧 JWT 缓存和 Gateway 侧签名校验
  - 更新 `agenthub-plugin/src/skills/connect.md`，使 skill 文案与当前最小实现一致
  - 更新 `docs/task/dev-c-plugin-auth.md`，标注 Dev C 当前只实现 `ah:connect` 最小路径
  - 新增 `docs/task/dev-c/dev-c-ah-connect-minimal.md` 作为当前阶段执行文档
  - 新增 `docs/api/auth-connect-api-v1.0.md` 记录 `public-auth` 接口文档
  - 更新 `feature_list.json`，补充 feat-010 的当前证据文件
  - 补充 `wallet_connect` 的 `network` / `isNew` 返回字段，并让 Gateway `public-auth` 路由统一输出 snake_case 字段
  - 新增内存态 `public-auth` 开发服务器，可独立启动 Dev C 联调链路
  - 新增 plugin `smoke:connect` 命令，实际跑通一次本地 `wallet_connect` 闭环
  - （历史）曾通过 `dev:public-auth` + `smoke:connect` 做最小链路联调
  - 为 `agenthub-plugin` 增加正式启动入口 `npm run start`
  - 为 Claude Code 接入增加 MCP 配置生成命令 `npm run claude:config`
  - 新增 `agenthub-plugin/README.md` 和 `agenthub-plugin/CLAUDE-CODE-INTEGRATION.md`
  - 更新 `agenthub-plugin/CLAUDE.md`，使其与当前最小实现一致
  - 明确下一阶段采用“Claude 插件壳 + MCP 内核”方案
  - 新增 `docs/task/dev-c/dev-c-claude-plugin-wrapper-minimal.md` 作为下一阶段任务文档
  - 为 `agenthub-plugin` 增加 Claude 插件壳骨架：`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`
  - 为 `agenthub-plugin` 增加内置 `.mcp.json`，使 Claude 插件安装后可直接加载本地 MCP 运行时
  - 将 Claude 命令命名空间收敛为 `/agenthub:*`，当前连接入口对齐为 `/agenthub:connect`
  - 将 Plugin 运行时默认 Gateway 收敛为本地 `http://127.0.0.1:8080`，并保留 `AGENTHUB_GATEWAY_URL` 作为远端环境覆盖项
  - 当前产品路径只保留 `commands/connect.md`、`commands/faucet.md`、`commands/run.md`，不再提供手动 setup 命令
  - 更新 `agenthub-plugin/README.md` 和 `agenthub-plugin/CLAUDE-CODE-INTEGRATION.md`，明确“插件壳 + MCP 内核”的分层关系
  - 当前产品路径不再写入用户级 Claude `settings.json`，统一依赖插件内置 `.mcp.json`
  - 将 Claude marketplace 正式安装入口上移到仓库根目录，新增 `<repo-root>/.claude-plugin/marketplace.json`
  - 将 `agenthub-plugin/.claude-plugin/marketplace.json` 收敛掉，避免“根目录 marketplace -> 子目录 marketplace”双重解析
  - 实测通过 `claude plugin marketplace add .\` + `claude plugin install agenthub` 从仓库根安装插件
  - 实测通过 `claude mcp list` 看到 `plugin:ah:agenthub` 连接到缓存中的 `dist/index.js`
  - 将原本散落在 plugin 内的本地钱包逻辑收敛为进程内 Wallet Bridge SDK：`FileSystemWalletBridge`
  - 让 `wallet_connect` 改为通过 Wallet Bridge SDK 完成 connect / sign，而不是直接依赖底层钱包存储
  - 新增 `wallet_status` tool，最小返回 `connected`、`walletPubkey`、`network`、`tokenCached`
  - 为 Wallet Bridge SDK 和 `wallet_status` 增加最小单测，并保持 `smoke:connect` 与现有 `wallet_connect` 用例通过
- 新增 Gateway 受保护 `POST /v1/consumer/match` 最小实现，明确 `match` 属于登录后 Consumer 域而非 public browse
- 新增 `match.service.ts` 最小 fallback 排序逻辑：按 tags / price 过滤后返回 `top`、`alternatives`、`reason`
- 新增 plugin `GatewayClient.matchAgent()`，打通到 `consumer/match` 的受保护请求映射
- 为 Gateway `match.service`、`consumer/match` route 和 plugin `matchAgent()` client 增加最小测试并跑通
- 新增 plugin `run_agent_task` 最小闭环：要求先登录，再通过 x402 client 执行任务并回传 receipt
- 新增 plugin `MockX402Client`，当前以 mock 结果、mock 交易签名和 mock payer 收敛 `ah:run` 第一阶段
- 新增 Gateway 受保护 `POST /v1/consumer/receipts` 最小实现，当前完成 JWT 校验、payer 一致性校验、交易校验注入点与 receipt 返回
- 新增 `services/consumer/index.ts` 的最小 `createReceipt()` 实现，当前先以 `verifyTransaction` 注入和 mock `true` 跑通回执链路
- 为 plugin `run_agent_task`、plugin `submitReceipt()`、Gateway `consumer/receipts` route、Gateway `consumer service` 增加最小测试并跑通
- 新增 plugin `match_capability` tool，正式暴露受保护 `consumer/match` 匹配能力
- 为 `match_capability` 增加已登录调用和未登录拒绝的最小单测
- 新增 Claude command `/agenthub:run`，按 `wallet_status -> match_capability -> 用户确认 -> run_agent_task` 编排现有 MCP tools
- 修正 `/agenthub:connect` command 的 allowed-tools，使其直接允许调用插件内 `wallet_connect` MCP tool
- 新增 plugin `wallet_faucet` tool，通过 Gateway 受保护接口 `POST /v1/consumer/faucet` 为当前登录钱包领取 Solana devnet SOL；USDC 由 Gateway 持有 `AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY` 签名转账
- 新增 Claude command `/agenthub:faucet`，按 `wallet_status -> wallet_faucet` 编排测试资产领取
- 新增真实 SVM x402 client 最小实现：通过 `@x402/fetch` 包装请求、解码 `PAYMENT-RESPONSE`、提取 tx / payer / amount / network
- 为 Wallet Bridge SDK 增加 `getSvmSigner()`，可从本地钱包 keypair 生成 `@x402/svm` client signer
- `run_agent_task` 默认切换为 Wallet Bridge signer 驱动的真实 SVM x402 client；`AGENTHUB_X402_MODE=mock` 仅作为本地开发回退
- 为真实 x402 client、Wallet Bridge signer、默认 x402 client 选择逻辑补充单测，并验证 `agenthub-plugin npm test` 与 `npm run build` 通过
- Gateway `consumer/match` 默认改为从 Prisma 读取 active Agents，并新增 seed Weather Agent，默认 endpoint 为 `http://127.0.0.1:9000/v1/execute`
- Gateway `consumer/receipts` 默认改为 Solana devnet 交易存在/confirmed 校验，并写入 Quote / Order / Receipt，同时递增 Agent `totalOrders`
- Plugin `run_agent_task` 对 Weather Agent 发送 `{ city }` payload，支持 object result 并用稳定 JSON 计算 `resultHash`
- 把 `wallet_faucet` 从 Plugin 本地持有 faucet wallet 改为 Gateway 受保护接口调用：Plugin `/agenthub:faucet` 只通过 Gateway `POST /v1/consumer/faucet` 申请资产，Gateway 持有 `AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY` 签名 USDC 转账
- Gateway `POST /v1/consumer/faucet` 已补齐：JWT 鉴权后为当前钱包请求 Solana devnet SOL，并在 Gateway 配置公共 faucet wallet 时转入 devnet USDC
- Gateway `consumer/match` 默认已从 Prisma 读取 `status=active` 的 Agents，seed Weather Agent 可被 `/agenthub:run` 匹配
- Gateway `consumer/receipts` 已从纯随机返回升级为写入 Quote / Order / Receipt，并递增 Agent `totalOrders`
- Gateway `consumer/receipts` 已把 verifier 接口收敛为 `verifyTransaction(txSignature, { payer, amount, network })`，并新增 `amount === agent.priceUsdcMicro` 校验，避免插件上报金额与当前 Agent 标价不一致时仍落库
- Plugin 侧已移除本地 faucet wallet 残留实现，`wallet_faucet` 只通过 Gateway 受保护接口申请资产
- 清理历史遗留的手动 setup 路径：删除旧 setup command、`claude:setup` 脚本和对应测试，统一依赖 Claude 插件内置 `.mcp.json` 自动加载本地 MCP runtime
- 清理历史 Wallet Bridge HTTP 占位：`wallet-bridge/index.ts` 收敛为进程内 SDK 统一导出入口，删除未使用的 `wallet-bridge/signer.ts`
- 同步更新 Plugin README、Claude Code 集成文档、Dev C task/progress、Plugin 规则、环境变量说明、spec 和 CLI guide，统一说明当前不启动 `localhost:8090` 钱包 HTTP 服务
- 本地端到端验收进展：
  - Gateway 使用 `PORT=18080`、`DATABASE_URL=file:./data/agenthub.db?journal_mode=WAL` 启动成功
  - `ah:connect` 等价链路通过：Plugin 创建/加载钱包，Gateway challenge / verify 返回 JWT，Prisma `Wallet` 已 upsert，`AuthChallenge.used=true`
  - `ah:run` 的 match 阶段通过：`weather in Shanghai` 匹配到 `seed-agent-weather`，endpoint 为 `http://127.0.0.1:9000/v1/execute`
  - Weather Agent 安装 Python 依赖后启动成功，`GET /health` 返回 `status=ok`，未付费 `POST /v1/execute` 返回 HTTP 402
  - `ah:faucet` 当前默认 RPC 已收敛为 `https://devnet.helius-rpc.com/?api-key=ea3297f1-582d-4b7d-b287-ecd5c8b05ecb`
- 真实 `ah:run` 已打通：x402 支付成功后可拿到 Weather Agent 结果，若 receipt 落库失败则插件返回 `receiptError` 但不再吞掉结果
- 修复 `agenthub-agent-weather` 的 x402 facilitator client 类型错误：此前把同步 `httpx.Client` 注入 `HTTPFacilitatorClient`，导致支付校验阶段 `await client.post(...)` 抛出 `TypeError: 'Response' object can't be awaited`；现已改为 `httpx.AsyncClient(trust_env=False)` 并在 FastAPI shutdown 时关闭该 client
- 当前 `POST /v1/consumer/receipts` 已按黑客松最小闭环收敛为“只落库、不做链上验证”：Gateway 不再调用 Solana RPC 校验 tx/payer/amount，只校验 JWT 钱包存在和 Agent 存在，并创建 Quote / Order / Receipt；`Order.paymentVerified` 与 API 返回 `payment_verified` 均为 `false`
- Plugin `run_agent_task` 已按结果优先返回收敛：即使 receipt 上报失败，只要 provider 执行成功，Claude 侧仍会拿到 `result + txSignature`，同时返回 `receiptError`

## 阻塞问题
- `init.sh` 本次执行返回成功；仍需持续保证 Gateway / Plugin 的依赖安装和数据库初始化脚本在新机器上可重复执行
- `agenthub-plugin` 当前路径不做 Wallet Bridge HTTP 服务；仍缺余额查询、加密钱包存储，与长期钱包安全设计仍有差距
- `agenthub-gateway/package.json` 与 workspace 级 TypeScript/构建问题仍存在，但当前已被隔离在 Dev C 本地联调闭环之外
- `agenthub-gateway/apps/gateway` 的 `build` 仍受现有 TypeScript 配置与共享 `packages/auth` 占位文件影响；当前 `consumer/match` 测试通过，但未单独解决该基建问题
- `run_agent_task` 已默认走真实 SVM x402 client，但尚未做完整 x402 交易金额、USDC mint、payee 精确解析
- `consumer/receipts` 已收敛 verifier 接口形状并增加金额一致性校验，但链上仍只验证 devnet 交易存在/confirmed；USDC mint、payee、链上 amount 精确解析仍未完成
- `wallet_faucet` 已改为 Gateway 服务端方案，Plugin 不再直接持有 faucet wallet 私钥；USDC 领取依赖 Gateway 配置 `AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY` 并确保该公共钱包已有 devnet USDC
- 本地端到端真实支付阻塞在 Node/undici 出网访问 Solana devnet RPC；PowerShell 可访问同一 RPC，但 Node `@solana/web3.js` 当前超时
- Gateway 还未配置 `AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY`，即使 RPC 出网修复，USDC faucet 也需要先给服务端公共钱包准备 devnet USDC
- `agenthub-gateway/apps/gateway` 已安装 `@solana/spl-token@^0.4.9`，consumer/receipts 和 consumer/faucet 路由测试通过；剩余 TypeScript 编译错误源自 `packages/auth` 的 rootDir 配置问题，非 Dev C 本次改动引起
- 已收敛 `public-auth` 路由为 canonical `/v1/public/auth/*`，并移除 `dev:public-auth` 独立开发服务器与 `/public-auth/*` 无版本入口
- `@agenthub/auth` CJS/ESM interop 阻塞已通过直接引用 `packages/auth/src/index` 当前实现绕开；后续如果要恢复 workspace package import，需要由基建负责人统一调整 `packages/auth` 的构建输出格式

## 职责边界

### Dev C 负责
- `agenthub-plugin/` 全部：MCP Server、tools、skills、Gateway client、x402 client、Claude Code 接入说明
- `wallet-bridge`：当前负责进程内钱包创建、加载、签名、导出能力；`localhost:8090` 本地 HTTP 服务暂不属于当前产品路径
- Gateway `public-auth`：challenge / verify、钱包 JWT、CLI 到 Web 的 token 跳转约束
- Gateway `consumer`：match、receipts、ratings、orders、dashboard 等 Consumer 统一后端接口
- Dev C 独占实现文件：`routes/public-auth/`、`routes/consumer/`、`services/auth.service.ts`、`services/match.service.ts`、`services/consumer/`、`packages/types/src/consumer.ts`、`apps/gateway/src/lib/errors/consumer.ts`

### Dev C 不负责
- Consumer Web 页面、组件、前端路由与前端 `lib/api/consumer.ts`，这些归 Dev B
- Marketplace / Provider 路由、服务、页面与类型，归 Dev A
- Schema、middleware、`packages/auth`、`packages/chain` 公共基建、workers、layout、Docker，归 admin / 基建负责人

### Consumer 模块前后端分层
- Dev C 实现 Consumer 统一后端接口服务
- Dev B 只消费这些接口，在 Web 端做页面、状态管理和 API client 封装
- `consumer gateway api` 是后端域，不等于 Consumer Web

## 上下游依赖

### Dev C 的上游
- admin / 基建负责人：Schema、共享 middleware、`packages/auth`、`packages/chain`、workers、部署基建
- Dev A：可匹配 Agent 数据、Marketplace 列表与详情字段、Provider 侧产生的 Agent 供给
- 外部 Provider：x402 Agent endpoint
- 外部服务：Claude rerank API、Solana RPC、Pinata / IPFS、ERC-8004 SDK

### Dev C 的下游
- Dev B：Consumer Dashboard / Orders / Receipts / Wallet / Login 页面依赖 Dev C 提供的认证与 Consumer API
- Claude Code：通过 MCP stdio 调用 `agenthub-plugin` 暴露的 tools
- Web Dashboard：依赖 `ah:dashboard` 传递的 token 或后续兑换后的登录态

## Consumer CLI 主链路摘要

### `ah:connect`
- Claude Code 通过 MCP stdio 调 `wallet_connect`
- Plugin 通过进程内 Wallet Bridge SDK 创建或加载本地钱包
- Plugin 请求 Gateway `public-auth` challenge / verify
- Gateway 返回 JWT，Plugin 缓存在本地进程内存

### `ah:run`
- Plugin 先确认登录态，再请求 Consumer 匹配接口
- Gateway `match.service.ts` 读取 Agent 数据并进行 rerank
- Plugin 调 Provider 的 x402 Agent endpoint
- Wallet 签名支付交易后再次发起请求
- Agent 返回结果与 payment receipt
- Plugin 上报 `/v1/consumer/receipts`
- Gateway 校验链上交易并生成 Order / Receipt

### `ah:dashboard`
- Plugin 读取当前登录 token
- 通过浏览器跳转到 Web Dashboard
- Web 端验证 token 并落登录态
- Dashboard 页面再调用 Consumer API 获取报表与订单数据

### `ah:faucet`
- Claude Code 通过 MCP stdio 调 `wallet_faucet`
- Plugin 检查登录态（需先完成 `wallet_connect`）
- Plugin 调用 Gateway `POST /v1/consumer/faucet`（带 JWT）
- Gateway 用持有的 `AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY` 签名并执行 Solana SOL 空投 + USDC 转账
- 结果返回 Plugin 显示给用户

## 项目总体进度

### 已完成功能
- Dev C `ah:connect` 最小功能闭环
- Dev C `ah:connect` 本地联调闭环
- Dev C Wallet Bridge SDK 最小抽象层
- Dev C `wallet_status` 最小闭环
- Dev C Consumer 受保护 `match` 最小接口
- Dev C plugin `match_capability` 最小闭环
- Dev C `run_agent_task` + `consumer/receipts` 最小闭环
- Dev C Claude command `/agenthub:run` 最小编排入口
- Dev C `wallet_faucet` + `/agenthub:faucet` devnet 领水入口（已改为 Gateway 服务端方案）

### 进行中功能
- Dev C `ah:run` 已推进到真实 x402 默认路径、Weather Agent payload 和 Gateway 订单落库最小闭环
- Dev C `wallet_faucet` 服务端方案已实现（Gateway `POST /v1/consumer/faucet` + Plugin gateway client 调用）

## 下一步计划
- 使用真实 x402 Provider endpoint 验证默认 real 模式下的 `/agenthub:connect -> /agenthub:faucet -> /agenthub:run`
- 给 Gateway 公共 faucet wallet 配置 devnet USDC，验证 `/agenthub:faucet` 的真实 USDC 转账链路
- 继续把 Gateway `consumer/receipts` 从当前 expected payment 接口升级为 USDC mint / amount / payee 精确链上校验
- 在不引入本地 HTTP 服务的前提下继续扩展 Wallet Bridge SDK 能力

## 风险与注意事项
- 确保所有开发人员遵循 AGENTS.md 中的工作规则
- 定期更新 `feature_list.json` 和 `docs/progress/dev-c.md`
- 保持 init.sh 脚本的最新状态，确保能正确初始化和验证项目
