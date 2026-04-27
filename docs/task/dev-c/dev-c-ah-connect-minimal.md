# Dev C 阶段任务 — `ah:connect` 最小路径

> 状态: 已实施（历史阶段，联调入口已收敛）
> 负责人: Dev C
> 关联总任务: [dev-c-plugin-auth.md](../dev-c-plugin-auth.md)
> 最后更新: 2026-04-21

## 1. 阶段目标

在不展开 `ah:run`、完整 Wallet Bridge、Receipt/Rating 的前提下，打通 Dev C 的最小认证闭环：

- Plugin 以 MCP stdio 方式启动
- `wallet_connect` tool 可调用
- 本地创建或加载开发态钱包文件
- 调 Gateway `public-auth` 完成 challenge / verify
- Plugin 在内存中缓存 JWT
- Dev C 可在本地独立启动并验证这条链路

## 2. 阶段范围

### 2.1 包含范围

- `agenthub-plugin/src/index.ts` 启动 MCP Server
- `agenthub-plugin/src/tools.ts` 注册 `wallet_connect`
- `agenthub-plugin/src/wallet-bridge/wallet.ts` 提供开发态本地钱包加载/创建
- `agenthub-plugin/src/gateway-client.ts` 调用 `public-auth` 接口
- `agenthub-gateway/apps/gateway/src/routes/public-auth/index.ts` 暴露 challenge / verify 路由
- `agenthub-gateway/apps/gateway/src/services/auth.service.ts` 生成 challenge、校验签名、签发 JWT
- `agenthub-plugin/src/dev/wallet-connect-smoke.ts` 提供本地 smoke 入口

### 2.2 非范围

- 完整 Wallet Bridge HTTP 服务 `localhost:8090`
- AES-256-GCM 钱包加密存储
- 真实余额查询和 `wallet_status`
- `wallet_export`
- `ah:run`、`ah:receipt`、`ah:dashboard`
- `/v1/public/match`
- `/v1/consumer/receipts`、`/v1/consumer/ratings`

## 3. 当前实现约束

- 本阶段允许绕过完整 Wallet Bridge，直接在 plugin 进程内读写开发态钱包文件
- Auth 走真实 challenge + 签名 + JWT 链路
- 当前联调统一走 Gateway 主服务 canonical 路由 `/v1/public/auth/*`
- Gateway 对外响应字段按 API 文档使用 snake_case
- Plugin 内部结构化结果继续使用 camelCase，避免 MCP tool 内部对象再做一次转换

## 4. 依赖关系

### 4.1 依赖别人提供

- 项目负责人提供可用的 Prisma schema、`AuthChallenge` / `Wallet` 模型和 `packages/auth` 基础能力
- Gateway 路由自动加载机制已存在，不需要 Dev C 修改入口文件

### 4.2 当前不阻塞本阶段

- Dev A 的市场接口
- Dev B 的 dashboard 免登录跳转
- 完整 x402 Agent

## 5. 验收标准

- `agenthub-plugin` 可通过 `npm run build` 构建
- `wallet_connect` 可完成 `load/create wallet -> challenge -> sign -> verify -> cache token`
- `wallet_connect` 返回至少包含 `walletPubkey`、`tokenCached`、`network`、`isNew`
- Gateway `GET /v1/public/auth/challenge` 返回 `challenge`、`nonce`、`expires_in`
- Gateway `POST /v1/public/auth/verify` 返回 `token`、`wallet_pubkey`、`expires_in`
- Plugin 和 Gateway 均有最小单元测试覆盖
- `npm run smoke:connect` 可在本地完成一次真实的 `wallet_connect` smoke 验证

## 6. 本地联调步骤

### 6.1 启动 Gateway 主服务

在 [package.json](C:\Users\hanchao.wang\repos\hfpay-agenthub-web\agenthub-gateway\apps\gateway\package.json) 所在目录执行：

```powershell
cd agenthub-gateway/apps/gateway
$env:JWT_SECRET = "dev-secret"
$env:PORT = "18080"
pnpm start:dev
```

预期结果：

- 监听 `http://127.0.0.1:18080`
- 暴露 `GET /health`
- 暴露 canonical `/v1/public/auth/challenge` 和 `/v1/public/auth/verify`

### 6.2 执行 Plugin 侧 smoke 验证

在 [package.json](C:\Users\hanchao.wang\repos\hfpay-agenthub-web\agenthub-plugin\package.json) 所在目录执行：

```powershell
cd agenthub-plugin
$env:AGENTHUB_GATEWAY_URL = "http://127.0.0.1:18080"
$env:AGENTHUB_WALLET_PATH = ".\\.tmp-agenthub-wallet.json"
npm run smoke:connect
```

预期结果：

- 输出 `walletPubkey`
- `tokenCached` 为 `true`
- 返回 `network: "solana:devnet"`
- 首次运行 `isNew` 为 `true`，复用钱包时为 `false`

### 6.3 已完成的本地验证

当前阶段已实际验证以下命令可用：

- `agenthub-plugin`：`npm test`
- `agenthub-plugin`：`npm run build`
- `agenthub-gateway/apps/gateway`：`npm test`
- `agenthub-plugin`：`npm run smoke:connect`

## 7. 已知遗留

- 仓库当前仍未满足 `init.sh` 全量恢复要求
- 完整 Wallet Bridge 仍待后续阶段实现
- workspace 根目录存在共享基建问题，本阶段不处理
