# Dev C Real Weather x402 Minimal

> 分支: `dev-c/feature-v1`
> 范围: Dev C owned Gateway consumer/auth + `agenthub-plugin/`

## 目标

把当前 `/agenthub:connect -> /agenthub:faucet -> /agenthub:run` 从 mock 闭环推进到真实最小闭环：

- `/agenthub:connect` 通过完整 Gateway public-auth 登录，并把钱包 upsert 到 Prisma SQLite
- `/agenthub:faucet` 真实领取 Solana devnet SOL；USDC 由 Gateway 持有 `AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY` 签名转账（通过 Gateway 受保护接口）
- `/agenthub:run` 匹配本地数据库中的 active Weather Agent
- `/agenthub:run` 调用 `agenthub-agent-weather` 的 x402 endpoint，并使用测试网 x402 支付
- Gateway receipt 先验证 Solana 交易存在且 confirmed/finalized，再写入 Quote / Order / Receipt

## 非范围

- 不实现 Rating / Dashboard / Receipt 查询
- 不实现完整 SVM 交易金额、USDC mint、payee 精确解析
- 不实现 Wallet Bridge HTTP 服务形态
- 不新增或修改 Prisma schema

## 实施步骤

1. Gateway `consumer/match` 默认从 Prisma 读取 active Agent。
2. Gateway `consumer/receipts` 默认用 Solana RPC 验证交易存在并落库 Quote / Order / Receipt。
3. Plugin `run_agent_task` 支持 weather payload：从自然语言任务提取 city，向 weather endpoint 发送 `{ city }`。
4. Plugin 支持 object result，并使用稳定 JSON 做 `resultHash`。
5. 将 `/agenthub:run` 文档从 mock 口径改成真实最小闭环口径。

## 验收

- `./init.sh` 通过
- `agenthub-plugin npm test` 通过
- `agenthub-plugin npm run build` 通过
- Gateway consumer/auth 相关测试通过
- 手动联调时需要：
  - Gateway 使用本地 Prisma SQLite 数据库
  - 数据库中存在 active Weather Agent，endpoint 指向 `agenthub-agent-weather /v1/execute`
  - `AGENTHUB_X402_MODE=real`
  - Gateway 已配置 `AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY`，且该公共 wallet 已有 devnet USDC
  - weather provider 正常启动
