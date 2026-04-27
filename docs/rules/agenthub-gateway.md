# AgentHub Gateway 项目指南

## 1. 项目概述

agenthub-gateway 是 AgentHub 平台的核心子项目，采用 pnpm workspace 结构，包含后端 API 服务和前端 Web 应用。该项目实现了平台的主要业务逻辑、数据处理和用户界面，是连接用户与 Agent 服务的核心枢纽。

## 2. 目录结构

```
agenthub/agenthub-gateway/
├── apps/             # 应用层
│   ├── gateway/      # 后端 API 服务 (Fastify + TypeScript)
│   └── web/          # 前端 Web 应用 (Next.js 14 + Tailwind CSS)
├── packages/         # 共享包
│   ├── auth/         # 认证系统
│   ├── chain/        # 链上集成 (ERC-8004、IPFS、x402)
│   └── types/        # TypeScript 类型定义
├── prisma/           # 数据库配置 (Prisma + SQLite)
├── scripts/          # 辅助脚本
└── 配置文件          # workspace、TypeScript、Docker 等配置
```

## 3. 核心功能

### 3.1 后端 API (apps/gateway/)
- 提供完整的 RESTful API 服务
- 实现用户认证和授权
- 处理 Agent 市场的核心业务逻辑
- 集成链上操作和 IPFS 存储
- 支持实时反馈和异步处理

### 3.2 前端 Web (apps/web/)
- 多角色用户界面 (Admin/Consumer/Provider)
- Agent 市场浏览和搜索
- Agent 注册和管理
- 订单和钱包管理
- 响应式设计，支持多种设备

### 3.3 共享包 (packages/)
- **auth**: 统一的认证服务，提供钱包签名认证和 JWT 令牌管理
- **chain**: 链上操作封装，包括 ERC-8004 身份、x402 支付和 IPFS 元数据
- **types**: 项目类型定义，提供全项目共享的 TypeScript 类型

## 4. 技术栈

| 类别 | 技术 |
|------|------|
| 后端框架 | Fastify + TypeScript |
| ORM | Prisma + SQLite (WAL mode) |
| 前端框架 | Next.js 14 (App Router) + Tailwind CSS |
| 认证 | 钱包签名 + JWT |
| 链上身份 | 8004-solana SDK (ERC-8004 on Solana) |
| 链上支付 | @x402/fetch + @x402/svm (USDC) |
| 离链存储 | IPFS (Pinata) |
| 构建工具 | pnpm + TypeScript |
| 部署 | Docker + Docker Compose |

## 5. 团队分工

详细团队分工请参考：`AGENTS.md` 中的 "团队分工与角色" 部分

## 6. 开发规范

### 6.1 代码编写规范

详细的代码编写规范请参考：`docs/rules/agenthub-gateway-code-guidelines.md`

该文档包含：
- 命名规范
- TypeScript 规范
- 代码风格
- 注释规范

### 6.2 分层架构与依赖关系

详细的分层架构和依赖关系请参考：`docs/rules/agenthub-gateway-code-guidelines.md`

该文档包含：
- 整体架构
- 各层职责
- 核心模块结构
- 依赖关系规则

### 6.3 项目特定规范

项目特定的开发规则请参考：`/agenthub-gateway/CLAUDE.md`

该文档包含：
- 目录归属矩阵
- 接口约定
- ERC-8004 链上操作规则
- 测试要求

## 7. 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发环境
pnpm dev

# 只启动后端 API
pnpm dev:gateway

# 只启动前端 Web
pnpm dev:web

# 数据库初始化
pnpm db:generate
pnpm db:push
```

## 8. 最佳实践

1. **严格遵循目录归属矩阵**，不要跨模块修改代码
2. **所有链上操作必须通过 `packages/chain/` 封装**，不要直接调用链上 SDK
3. **业务逻辑应放在 Service 层**，Handler 只处理请求和响应
4. **使用预定义的错误码进行错误处理**，保持错误信息的一致性
5. **从 `@agenthub/types` 导入类型定义**，避免重复定义
6. **遵循单向依赖原则**，上层模块可依赖下层模块，反之不可
7. **使用异步/await 避免回调地狱**
8. **添加适当的注释和文档**，提高代码可读性

## 9. 相关文档

- **项目总规范**: `AGENTS.md`
- **代码编写规范**: `docs/rules/agenthub-gateway-code-guidelines.md`
- **项目开发规则**: `/agenthub-gateway/CLAUDE.md`
- **数据库设计规范**: `docs/schema/schema-index.md`
- **Git 规范**: `docs/rules/git-guidelines.md`
- **环境变量**: `docs/conf/env-variables.md`
