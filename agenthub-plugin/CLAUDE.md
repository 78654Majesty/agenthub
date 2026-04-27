# AgentHub Plugin - 开发规则

> 当前阶段：通用 MCP host 接入最小阶段。首个真实验收宿主为 Claude Code。

## 归属

**全部归 Dev C 独占**。不涉及其他开发者的文件。

## 技术栈

| 层 | 技术 |
|----|------|
| MCP Server | `@modelcontextprotocol/sdk` (stdio 模式) |
| x402 支付 | `@x402/fetch` + `@x402/svm` |
| 钱包 | 本地开发态 keypair 文件 |
| 链上交互 | `@solana/web3.js` |

## 目录结构

```
src/
├── index.ts              ← MCP Server 入口（stdio）
├── tools.ts              ← 当前正式 tool 定义
├── gateway-client.ts     ← Gateway REST API 调用
├── wallet-bridge/
│   └── wallet.ts         ← 开发态 keypair 文件读写
├── dev/
│   ├── wallet-connect-smoke.ts
│   ├── claude-code-config.ts
│   └── print-claude-code-config.ts
└── skills/               ← ah: 命令的 Skill Prompt 文件
    ├── connect.md
    ├── run.md
    ├── market.md
    ├── dashboard.md
    ├── receipt.md
    └── help.md
```

## 当前正式 Tool

| Tool 名称 | 说明 |
|-----------|------|
| `wallet_connect` | 连接/创建开发态钱包 + Gateway Auth |

## 开发规则

### 与 Gateway 交互

- 所有 Gateway 调用通过 `gateway-client.ts` 的 `GatewayClient` 类
- 不要直接用 fetch 调 Gateway API
- Gateway base URL 从环境变量读取
- 默认 Gateway 为 `http://127.0.0.1:8080`，切到其他环境时通过 `AGENTHUB_GATEWAY_URL` 覆盖

### 当前钱包层

- 当前阶段不启用完整 Wallet Bridge
- keypair 文件默认存储在 `~/.agenthub/dev-wallet.json`
- 通过 `AGENTHUB_WALLET_PATH` 可覆盖钱包文件路径

### Skill 文件

- Markdown 格式，描述命令的执行步骤
- Claude Code 加载后按步骤调用对应的 MCP Tools
- 修改 Skill 文件不需要重新构建

### 错误处理

- MCP Tool 返回错误时，使用 `isError: true` 标记
- 用户友好的错误信息，包含可操作的建议

## 当前常用命令

```bash
npm run dev          # tsx 热重载开发
npm run build        # tsc 编译到 dist/
npm run start        # 运行构建后的 MCP server
npm test             # 运行测试
npm run smoke:connect
npm run claude:config
```

## 与 Gateway 的 API 依赖

Plugin 调用的 Gateway 端点：

| 端点 | 用途 |
|------|------|
| `GET /v1/public/auth/challenge` | 获取签名 challenge |
| `POST /v1/public/auth/verify` | 验证签名获取 JWT |

## Claude Code 接入

- 正式入口是构建后的 stdio server：`node dist/index.js`
- 正式 tool 名是 `wallet_connect`
- `smoke:connect` 只是开发自测命令
- `/agenthub:connect` 是 Claude Code 上的用户入口别名策略，不是协议层 tool 名
- 接入说明见 [CLAUDE-CODE-INTEGRATION.md](./CLAUDE-CODE-INTEGRATION.md)
