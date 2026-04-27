# agenthub

AgentHub - AI Agent 链上市场平台。ERC-8004 身份 + x402 支付 + IPFS 元数据。

## 快速开始

```bash
# 克隆仓库
git clone <repository-url>
cd agenthub

# 安装依赖（Gateway）
cd agenthub-gateway
pnpm install

# 启动开发环境
pnpm dev
```

## 项目结构

```
agenthub/
├── agenthub-gateway/     # 后端 API + Web 前端（pnpm workspace）
│   ├── apps/
│   │   ├── gateway/      # Fastify API 后端
│   │   └── web/          # Next.js 前端
│   ├── packages/         # 共享包
│   └── prisma/           # 数据库配置
├── agenthub-plugin/      # Claude Code MCP Plugin
└── docs/                 # 设计文档
```

## 技术栈

| 层 | 技术 |
|----|------|
| Gateway API | Fastify + TypeScript |
| ORM | Prisma + SQLite (WAL mode) |
| Web | Next.js 14 (App Router) + Tailwind |
| Plugin | @modelcontextprotocol/sdk (stdio) |
| 链上身份/声誉 | `8004-solana` SDK (ERC-8004 on Solana) |
| 链上支付 | `@x402/fetch` + `@x402/svm` (USDC) |
| 离链元数据 | IPFS (Pinata) |

## 文档

- [AGENTS.md](AGENTS.md) - 项目开发规范
- [CLAUDE.md](CLAUDE.md) - Claude Code 开发规则
- [docs/spec/](docs/spec/) - 需求文档
- [docs/rules/](docs/rules/) - 开发规范

## License

MIT