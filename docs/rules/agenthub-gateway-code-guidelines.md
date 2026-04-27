# AgentHub Gateway 代码编写规范与架构指南

## 1. 概述

本文件定义了 AgentHub Gateway 项目的代码编写规范、分层架构和依赖关系，确保代码的一致性、可维护性和可扩展性。

## 2. 代码编写规范

### 2.1 命名规范

#### 2.1.1 目录与文件命名
- 使用 kebab-case（短横线分隔）命名目录和文件
- 避免使用大写字母和特殊字符
- 示例：`user-service.ts`, `auth-middleware.ts`, `api-router.ts`

#### 2.1.2 变量与函数命名
- 使用 camelCase（驼峰命名法）命名变量和函数
- 示例：`userService`, `getAgentById()`, `authenticateUser()`

#### 2.1.3 类与接口命名
- 使用 PascalCase（帕斯卡命名法）命名类和接口
- 接口名以 `I` 为前缀（可选，但保持一致）
- 示例：`UserService`, `IAgentRepository`, `DatabaseConnection`

#### 2.1.4 常量命名
- 使用 UPPER_SNAKE_CASE（大写蛇形命名法）命名常量
- 示例：`MAX_PAGE_SIZE`, `JWT_SECRET_KEY`, `DATABASE_URL`

### 2.2 TypeScript 规范

- 严格使用 TypeScript，避免使用 `any` 类型
- 使用接口定义数据结构，而不是类型别名
- 为所有函数参数和返回值添加类型注解
- 从 `@agenthub/types` 导入项目共享类型

**示例：**
```typescript
import type { User } from '@agenthub/types';

function getUserById(id: string): Promise<User> {
  // implementation
}
```

### 2.3 代码风格

- 使用 2 个空格进行缩进
- 每行不超过 100 个字符
- 在逗号后换行，在运算符前换行
- 保持一致的代码风格，遵循项目的 Prettier 配置

**示例：**
```typescript
const user = await userService
  .getUserById(id)
  .then(user => user.toJSON())
  .catch(error => {
    logger.error('Failed to get user', error);
    throw error;
  });
```

### 2.4 注释规范

- 使用 JSDoc 为函数、类和接口添加文档注释
- 注释应说明"做什么"，而不是"怎么做"
- 复杂逻辑应添加单行注释解释
- 避免不必要的注释，代码应自解释

**示例：**
```typescript
/**
 * Authenticates a user using wallet signature
 * @param signature The wallet signature
 * @param message The message that was signed
 * @returns The authenticated user
 */
async function authenticate(signature: string, message: string): Promise<User> {
  // Verify signature using Solana web3.js
  const isVerified = await verifySignature(signature, message);
  
  if (!isVerified) {
    throw new AuthenticationError('Invalid signature');
  }
  
  return getUserByWallet(message);
}
```

## 3. 分层架构

### 3.1 整体架构

```
┌───────────────────────┐
│     Web 前端 (Next.js) │
└───────────┬───────────┘
            │
┌───────────▼───────────┐
│       API 层 (Fastify) │
└───────────┬───────────┘
            │
┌───────────▼───────────┐
│      Service 层       │
└───────────┬───────────┘
            │
┌───────────▼───────────┐
│      Repository 层    │
└───────────┬───────────┘
            │
┌───────────▼───────────┐
│      Prisma ORM       │
└───────────┬───────────┘
            │
┌───────────▼───────────┐
│     SQLite 数据库     │
└───────────────────────┘
```

### 3.2 各层职责

#### 3.2.1 API 层
- 处理 HTTP 请求和响应
- 路由定义和参数验证
- 错误处理和响应格式化
- 中间件应用（认证、日志、CORS 等）
- **注意**：不要在 Handler 中编写业务逻辑，应调用 Service 层

#### 3.2.2 Service 层
- 实现核心业务逻辑
- 协调不同 Repository 的操作
- 事务管理
- 业务规则验证
- **注意**：只接收纯数据参数，返回纯数据，不接触 req/reply 对象

#### 3.2.3 Repository 层
- 数据访问逻辑
- 与数据库的交互
- 实体映射
- 查询构建
- **注意**：只负责数据操作，不包含业务逻辑

### 3.3 核心模块结构

#### 3.3.1 Gateway API 结构

```
apps/gateway/src/
├── chain/          # 链上操作封装（锁定，基建代码）
├── lib/            # 工具库
├── middleware/     # 中间件（锁定，基建代码）
├── routes/         # API 路由
│   ├── admin/      # 管理员路由 (Dev B)
│   ├── consumer/   # 消费者路由 (Dev C)
│   ├── provider/   # 提供者路由 (Dev A)
│   └── public/     # 公共路由
├── services/       # 业务服务
└── workers/        # 工作线程（锁定，基建代码）
```

#### 3.3.2 Web 前端结构

```
apps/web/src/
├── app/            # 页面路由（Next.js App Router）
├── components/     # UI 组件
├── lib/            # 前端工具库
└── styles/         # 样式文件
```

#### 3.3.3 共享包结构

```
packages/
├── auth/           # 认证系统（锁定，基建代码）
├── chain/          # 链上集成（锁定，基建代码）
└── types/          # TypeScript 类型定义
```

## 4. 依赖关系

### 4.1 单向依赖原则

上层模块可以依赖下层模块，但下层模块不能依赖上层模块：

**正确依赖方向：**
```
API 层 → Service 层 → Repository 层 → Prisma ORM → 数据库
```

**错误依赖方向：**
```
Repository 层 → Service 层  // 下层模块依赖上层模块
```

### 4.2 共享包依赖规则

- 所有模块都可以依赖 `packages/types/`
- API 层和 Service 层可以依赖 `packages/auth/` 和 `packages/chain/`
- 共享包之间尽量避免相互依赖

### 4.3 第三方依赖管理

- 在 `apps/gateway/` 中使用 Fastify 相关依赖
- 在 `apps/web/` 中使用 Next.js 和 React 相关依赖
- 在 `packages/chain/` 中使用 Solana 和 IPFS 相关依赖
- 在 `packages/auth/` 中使用认证相关依赖
- 避免在共享包中引入过多的第三方依赖

### 4.4 依赖注入

- 尽量使用依赖注入模式，避免硬编码依赖
- 在 Service 层注入 Repository，在 API 层注入 Service
- 提高代码的可测试性和灵活性

**示例：**
```typescript
// UserService.ts
class UserService {
  constructor(private userRepository: UserRepository) {}
  
  async getUserById(id: string) {
    return this.userRepository.findById(id);
  }
}

// user-router.ts
const userService = new UserService(new UserRepository(prisma));

fastify.get('/users/:id', async (request) => {
  const { id } = request.params as { id: string };
  return userService.getUserById(id);
});
```

## 5. 最佳实践

### 5.1 错误处理

- 使用自定义错误类区分不同类型的错误
- 在 API 层统一处理错误并格式化响应
- 避免在 Service 层和 Repository 层直接返回 HTTP 状态码
- 使用预定义的错误码（参考 `/agenthub-gateway/CLAUDE.md`）

**示例：**
```typescript
// 使用预定义错误码
import { MARKET_ERRORS } from '../lib/errors/market';

throw Object.assign(new Error(), MARKET_ERRORS.AGENT_NOT_FOUND);
// → 自动返回 { status: 404, message: 'Agent 不存在' }
```

### 5.2 日志记录

- 使用结构化日志，便于查询和分析
- 记录关键操作的输入和输出
- 不要记录敏感信息（如密码、私钥等）
- 使用适当的日志级别（debug, info, warn, error）

### 5.3 性能优化

- 使用异步/await 避免回调地狱
- 利用数据库索引优化查询性能
- 避免 N+1 查询问题
- 使用缓存减少重复计算和数据库查询
- 对大文件和长时间运行的任务使用异步处理

### 5.4 安全性

- 对所有用户输入进行验证和消毒
- 使用参数化查询避免 SQL 注入
- 实施适当的访问控制
- 不要在代码中硬编码敏感信息
- 使用 HTTPS 保护数据传输

## 6. 代码审查要点

1. **架构一致性**：是否遵循了分层架构和依赖规则
2. **类型安全**：是否正确使用 TypeScript 类型系统，避免 `any` 类型
3. **错误处理**：是否有适当的错误处理机制，使用预定义错误码
4. **代码质量**：是否符合命名规范和代码风格
5. **性能考虑**：是否存在性能瓶颈，是否使用了适当的优化技术
6. **安全性**：是否存在安全漏洞（如 SQL 注入、XSS 等）
7. **可测试性**：代码是否易于测试，是否使用了依赖注入
8. **文档**：是否有足够的文档和注释
9. **目录归属**：是否遵循了目录归属矩阵（参考 `/agenthub-gateway/CLAUDE.md`）

## 7. 相关文档

- **项目指南**: `docs/rules/agenthub-gateway.md`
- **项目开发规则**: `/agenthub-gateway/CLAUDE.md`
- **Git 规范**: `docs/rules/git-guidelines.md`
- **数据库设计规范**: `docs/schema/schema-index.md`

