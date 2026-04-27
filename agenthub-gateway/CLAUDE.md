# AgentHub Gateway - 开发规则

> pnpm workspace：apps/gateway（Fastify API）+ apps/web（Next.js）+ packages/（共享库）

## 目录归属矩阵

### Gateway API (`apps/gateway/src/`)

| 目录/文件 | 归属 | 说明 |
|-----------|------|------|
| `index.ts` | 基建 (锁定) | 入口，禁止修改 |
| `config.ts` | 基建 (锁定) | 环境变量 |
| `lib/route-loader.ts` | 基建 (锁定) | 自动路由加载 |
| `lib/prisma.ts` | 基建 (锁定) | Prisma 单例 |
| `lib/errors/index.ts` | 基建 | 合并导出，新模块需在此注册 |
| `lib/errors/auth.ts` | Dev C | AUTH_ERRORS |
| `lib/errors/market.ts` | Dev A | MARKET_ERRORS |
| `lib/errors/consumer.ts` | Dev C | CONSUMER_ERRORS |
| `lib/errors/provider.ts` | Dev A | PROVIDER_ERRORS |
| `lib/errors/admin.ts` | Dev B | ADMIN_ERRORS |
| `middleware/*` | 基建 (锁定) | 认证中间件 |
| `routes/public-auth/` | Dev C | GET /challenge, POST /verify |
| `routes/public-market/` | Dev A | Marketplace 公开接口 |
| `routes/consumer/` | Dev C | Consumer 接口 |
| `routes/provider/` | Dev A | Provider 接口 |
| `routes/admin/` | Dev B | Admin 接口 |
| `services/auth.service.ts` | Dev C | 认证服务 |
| `services/match.service.ts` | Dev C | 匹配服务 |
| `services/market/` | Dev A | Marketplace 服务 |
| `services/consumer/` | Dev C | Consumer 服务 |
| `services/provider/` | Dev A | Provider 服务 |
| `services/admin/` | Dev B | Admin 服务 |
| `chain/*` | 基建 (锁定) | ERC-8004 + IPFS + tx-verify |
| `workers/*` | 基建 (锁定) | Feedback 上链 Worker |

### Web 前端 (`apps/web/src/`)

| 目录 | 归属 | 说明 |
|------|------|------|
| `app/layout.tsx` | 基建 | 根布局 |
| `app/page.tsx` | 基建 | Landing 首页 |
| `app/login/` | Dev B | 钱包登录 |
| `app/marketplace/` | Dev A | Agent 市场 |
| `app/dashboard/` | Dev B | Consumer Dashboard |
| `app/orders/` | Dev B | 订单管理 |
| `app/receipts/` | Dev B | Receipt 管理 |
| `app/wallet/` | Dev B | 钱包管理 |
| `app/provider/` | Dev A | Provider 全部页面 |
| `app/admin/` | Dev B | Admin 全部页面 |
| `lib/wallet.ts` | 基建 | 浏览器钱包 |
| `lib/auth.ts` | 基建 | 认证状态 |
| `lib/api/market.ts` | Dev A | Market API client |
| `lib/api/provider.ts` | Dev A | Provider API client |
| `lib/api/consumer.ts` | Dev B | Consumer API client |
| `lib/api/admin.ts` | Dev B | Admin API client |
| `components/layout/` | 基建 | 全局导航 |
| `components/marketplace/` | Dev A | 市场组件 |
| `components/provider/` | Dev A | Provider 组件 |
| `components/consumer/` | Dev B | Consumer 组件 |
| `components/admin/` | Dev B | Admin 组件 |

### 共享包 (`packages/`)

| 包 | 归属 | 说明 |
|----|------|------|
| `packages/types/src/common.ts` | 基建 (锁定) | 基础类型 |
| `packages/types/src/index.ts` | 基建 | re-export |
| `packages/types/src/market.ts` | Dev A | Market 类型 |
| `packages/types/src/consumer.ts` | Dev C | Consumer 类型 |
| `packages/types/src/provider.ts` | Dev A | Provider 类型 |
| `packages/types/src/admin.ts` | Dev B | Admin 类型 |
| `packages/auth/*` | 基建 (锁定) | 认证库 |
| `packages/chain/*` | 基建 (锁定) | ERC-8004 + IPFS |

## 接口约定

### Route Handler 签名

```typescript
// routes/{module}/index.ts
import { FastifyInstance } from 'fastify';

export default async function (app: FastifyInstance) {
  app.get('/endpoint', { preHandler: [verifyWalletJwt] }, async (req, reply) => {
    // 调用 service 层，不在 handler 中写业务逻辑
    const result = await someService.doSomething(req.body);
    return reply.send({ success: true, data: result });
  });
}
```

### Service 签名

```typescript
// services/{module}/index.ts
// 接收纯数据参数，返回纯数据。不接触 req/reply 对象。
export async function listAgents(filters: AgentFilters): Promise<AgentListItem[]> {
  // 业务逻辑 + prisma 调用
}
```

### 错误处理

```typescript
// 使用预定义错误码
import { MARKET_ERRORS } from '../lib/errors/market';

throw Object.assign(new Error(), MARKET_ERRORS.AGENT_NOT_FOUND);
// → 自动返回 { status: 404, message: 'Agent 不存在' }
```

### 类型使用

```typescript
// 从 @agenthub/types 导入
import type { AgentListItem, MatchRequest } from '@agenthub/types';
// 只在自己的 types/{module}.ts 中添加新类型
```

## ERC-8004 链上操作规则

1. **所有链上操作都通过 `packages/chain/` 封装** — 不要直接 import `8004-solana`
2. **Agent 注册** — 只在 Admin 审批通过时调用 `registerAgentOnChain()`
3. **Feedback 提交** — 只通过 `feedback.worker.ts` 异步执行
4. **链上查询** — 通过 `agent-query.ts` 的封装函数查询
5. **IPFS 操作** — 通过 `ipfs-client.ts` 封装，不直接调用 Pinata API

## 测试要求（MVP 期间）

- Service 层：关键业务逻辑需要单元测试
- Route 层：可暂不测试
- Chain 层：mock SDK 测试
- Web：手动验证为主

## 常用命令

```bash
pnpm dev              # 同时启动 gateway + web
pnpm dev:gateway      # 只启动 gateway (port 8080)
pnpm dev:web          # 只启动 web (port 3000)
pnpm db:generate      # Prisma generate
pnpm db:push          # Prisma db push
pnpm build            # 构建全部
pnpm typecheck        # 类型检查
```
