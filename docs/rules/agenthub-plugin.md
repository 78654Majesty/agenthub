# AgentHub Plugin 项目指南

## 1. 项目概述

AgentHub Plugin 是一个基于 Model Context Protocol (MCP) 的插件，通过 stdio 模式与 Claude Code 集成，提供 Agent 市场浏览、任务执行、钱包管理功能。它允许用户通过命令行或其他 MCP 兼容客户端连接到 AgentHub 平台，使用 AI Agent 服务并处理支付。

## 2. 目录结构

```
agenthub-plugin/
├── src/
│   ├── skills/              # 技能文档
│   │   ├── connect.md       # 钱包连接技能
│   │   ├── dashboard.md     # 仪表板技能
│   │   ├── help.md          # 帮助技能
│   │   ├── market.md        # 市场浏览技能
│   │   ├── receipt.md       # 收据查询技能
│   │   └── run.md           # Agent 运行技能
│   ├── wallet-bridge/       # 进程内钱包 SDK
│   │   ├── index.ts         # SDK 统一导出入口
│   │   ├── sdk.ts           # connect/status/sign/x402 signer
│   │   └── wallet.ts        # 钱包管理 (keypair)
│   ├── gateway-client.ts    # Gateway API 客户端
│   ├── index.ts             # MCP Server 主入口 (stdio)
│   ├── tools.ts             # MCP Tools 定义
│   └── x402-client.ts       # x402 支付客户端
├── CLAUDE.md                # 详细开发规则
├── package.json             # 项目配置
└── tsconfig.json            # TypeScript 配置
```

## 3. 核心功能

### 3.1 MCP 工具提供

| Tool 名称 | 说明 |
|-----------|------|
| `wallet_connect` | 连接/创建钱包 + Gateway 认证 |
| `wallet_status` | 查询钱包状态和余额 |
| `wallet_export` | 导出私钥 (base58) |
| `market_list` | Marketplace Agent 列表 |
| `match_capability` | 根据任务描述匹配 Agent |
| `run_agent_task` | x402 付费调用 Agent + 上报 Receipt |
| `get_receipt` | 查询 Receipt 详情 + 链上状态 |
| `rate_agent` | 对已完成任务评分 (1-5) |
| `open_dashboard` | 打开浏览器跳转 Web Dashboard |

### 3.2 钱包 SDK

- 当前产品路径使用进程内 Wallet Bridge SDK，不启动 `localhost:8090` HTTP 服务
- Claude Code 通过插件内置 `.mcp.json` 启动本地 stdio MCP runtime
- MCP tools 在同一进程内调用 SDK 完成钱包创建、加载、状态查询、消息签名和 x402 SVM signer 获取
- 当前开发态 keypair 文件默认存储在 `~/.agenthub/dev-wallet.json`，可用 `AGENTHUB_WALLET_PATH` 覆盖
- AES-256-GCM 加密存储是后续钱包安全增强，不属于当前最小产品路径

### 3.3 Gateway API 客户端

- 提供与 AgentHub Gateway API 交互的类型化 HTTP 客户端
- 支持任务匹配、收据报告、收据查询和评分提交等功能
- 所有 Gateway 调用通过 `GatewayClient` 类，不要直接使用 fetch

### 3.4 x402 支付客户端

- 封装 @x402/fetch 实现 HTTP 402 支付门控请求
- 使用本地钱包签名器签署 Solana 支付交易
- 处理支付协商和交易提交
- 从 PAYMENT-RESPONSE header 提取 tx_signature, payer, amount

## 4. 技术栈

| 类别 | 技术 |
|------|------|
| MCP Server | @modelcontextprotocol/sdk (stdio 模式) |
| 支付协议 | @x402/fetch + @x402/svm |
| 区块链 | @solana/web3.js |
| 服务器 | fastify |
| 开发语言 | TypeScript |
| 钱包加密 | AES-256-GCM |

## 5. 团队分工

详细团队分工请参考：`AGENTS.md` 中的 "团队分工与角色" 部分

## 6. 开发规范

### 6.1 编码规范与架构

详细的编码规范和架构指南请参考：`docs/rules/agenthub-plugin-code-guidelines.md`

该文档包含：
- 命名规范
- TypeScript 规范
- 代码风格
- 分层架构
- 依赖关系
- 最佳实践

### 6.2 项目特定规范

项目特定的开发规则请参考：`/agenthub-plugin/CLAUDE.md`

该文档包含：
- 与 Gateway 交互规则
- x402 支付流程
- Wallet Bridge SDK 实现细节
- Skill 文件规范
- 错误处理规则

## 7. 快速开始

```bash
# 安装依赖
cd agenthub-plugin
npm install

# 开发模式
npm run dev

# 构建项目
npm run build

# 运行测试
npm test
```

## 8. 与 Gateway 的 API 依赖

Plugin 调用的 Gateway 端点：

| 端点 | 用途 |
|------|------|
| `GET /v1/public/auth/challenge` | 获取签名 challenge |
| `POST /v1/public/auth/verify` | 验证签名获取 JWT |
| `POST /v1/public/match` | 能力匹配 |
| `GET /v1/public/market/agents` | Agent 列表 |
| `POST /v1/consumer/receipts` | 上报 Receipt |
| `GET /v1/consumer/receipts/:id` | Receipt 详情 |
| `POST /v1/consumer/ratings` | 提交评分 |

## 9. 注意事项

1. 当前钱包能力只在本地 MCP runtime 进程内运行，不暴露本地 HTTP 端口
2. 所有链上操作都通过封装的客户端进行，不要直接操作区块链
3. 支付相关功能依赖 @x402/fetch 和 @x402/svm 库
4. 遵循 MCP 协议规范实现工具定义
5. 修改 Skill 文件不需要重新构建

## 10. 与其他模块的关系

- **agenthub-gateway**: 通过 Gateway API 客户端与之交互
- **Web 仪表板**: 当前不通过本地钱包 HTTP 服务接入，后续如需要跨进程签名再单独设计

## 11. 相关文档

- **项目总规范**: `AGENTS.md`
- **编码规范与架构**: `docs/rules/agenthub-plugin-code-guidelines.md`
- **项目开发规则**: `/agenthub-plugin/CLAUDE.md`
- **Git 规范**: `docs/rules/git-guidelines.md`
- **环境变量**: `docs/conf/env-variables.md`
- **Gateway 项目指南**: `docs/rules/agenthub-gateway.md`
