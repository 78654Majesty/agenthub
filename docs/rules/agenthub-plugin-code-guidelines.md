# AgentHub Plugin 编码规范与架构指南

## 1. 概述

本文件定义了 AgentHub Plugin 项目的编码规范、分层架构和依赖关系，确保代码的一致性、可维护性和可扩展性。本指南与 `/agenthub-plugin/CLAUDE.md` 一起构成 Plugin 项目的完整开发规范。

## 2. 编码规范

### 2.1 命名规范

#### 2.1.1 目录与文件命名
- 使用 kebab-case（短横线分隔）命名目录和文件
- 避免使用大写字母和特殊字符
- 示例：`wallet-bridge/`, `gateway-client.ts`, `x402-client.ts`

#### 2.1.2 变量与函数命名
- 使用 camelCase（驼峰命名法）命名变量和函数
- 示例：`gatewayClient`, `connectWallet()`, `executeAgentTask()`

#### 2.1.3 类与接口命名
- 使用 PascalCase（帕斯卡命名法）命名类和接口
- 接口名以 `I` 为前缀（可选，但保持一致）
- 示例：`GatewayClient`, `IWalletSigner`, `X402Client`

#### 2.1.4 常量命名
- 使用 UPPER_SNAKE_CASE（大写蛇形命名法）命名常量
- 示例：`AGENTHUB_GATEWAY_URL`, `AGENTHUB_WALLET_PATH`, `DEFAULT_TIMEOUT`

### 2.2 TypeScript 规范

- 严格使用 TypeScript，避免使用 `any` 类型
- 使用接口定义数据结构，而不是类型别名
- 为所有函数参数和返回值添加类型注解
- 使用泛型提高代码复用性

**示例：**
```typescript
interface AgentTask {
  agentId: string;
  taskText: string;
  parameters?: Record<string, unknown>;
}

async function executeAgentTask<T>(task: AgentTask): Promise<T> {
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
const result = await x402Client
  .execute(endpoint, taskPayload)
  .then(response => response.data)
  .catch(error => {
    logger.error('Failed to execute agent task', error);
    throw error;
  });
```

### 2.4 注释规范

- 使用 JSDoc 为函数、类和接口添加文档注释
- 注释应说明"做什么"，而不是"怎么做"
- 复杂逻辑应添加单行注释解释
- 为 MCP 工具添加详细的功能说明和参数文档

**示例：**
```typescript
/**
 * Executes an agent task via x402 payment
 * @param endpoint The agent endpoint URL
 * @param task The task payload
 * @param walletSigner The wallet signer for payment
 * @returns The agent response and payment transaction signature
 */
async function x402Execute(
  endpoint: string, 
  task: AgentTask, 
  walletSigner: Signer
): Promise<{ response: any; txSignature: string }> {
  // Implementation
}
```

## 3. 分层架构

### 3.1 整体架构

```
┌───────────────────────┐
│     MCP 客户端        │
└───────────┬───────────┘
            │
┌───────────▼───────────┐
│      MCP 服务端       │
├───────────┬───────────┤
│  工具定义 (tools.ts)  │
└───────────┬───────────┘
            │
┌───────────▼───────────┐
│    核心客户端层       │
├───────────┬───────────┤
│ GatewayClient │ X402Client │
└───────────┴───────────┘
            │
┌───────────▼───────────┐
│    钱包桥接服务       │
└───────────┬───────────┘
            │
┌───────────▼───────────┐
│     外部服务接口      │
├───────────┬───────────┤
│ Gateway API │ Solana Blockchain │
└───────────┴───────────┘
```

### 3.2 各层职责

#### 3.2.1 MCP 服务端层 (index.ts)
- 实现 MCP 协议服务端（stdio 模式）
- 注册和管理 MCP 工具
- 处理工具调用请求
- 自动检测和启动钱包桥接服务

#### 3.2.2 工具定义层 (tools.ts)
- 定义 9 个 MCP 工具的接口和实现
- 处理工具的输入验证和输出格式化
- 协调不同客户端的调用
- 实现错误处理和用户友好的错误信息

#### 3.2.3 核心客户端层
- **GatewayClient**: 与 AgentHub Gateway API 交互，封装所有 Gateway 调用
- **X402Client**: 处理 x402 支付和 Agent 任务执行

#### 3.2.4 钱包桥接服务层 (wallet-bridge/)
- 提供本地钱包服务（Fastify HTTP 服务器）
- 处理钱包创建、解锁和签名操作
- 当前开发态以本地文件存储钱包私钥，后续补 AES-256-GCM 加密
- 以进程内 SDK 供 MCP tools 使用，不暴露本地 HTTP API

### 3.3 核心模块结构

```
agenthub-plugin/src/
├── skills/                # 技能文档（Markdown 格式）
│   ├── connect.md        # 钱包连接技能
│   ├── dashboard.md      # 仪表板技能
│   ├── help.md           # 帮助技能
│   ├── market.md         # 市场浏览技能
│   ├── receipt.md        # 收据查询技能
│   └── run.md            # Agent 运行技能
├── wallet-bridge/         # 进程内钱包 SDK
│   ├── index.ts          # SDK 统一导出入口
│   ├── sdk.ts            # connect/status/sign/x402 signer
│   └── wallet.ts         # 钱包管理 (keypair)
├── gateway-client.ts      # Gateway API 客户端
├── index.ts              # MCP Server 主入口 (stdio)
├── tools.ts              # MCP Tools 定义
└── x402-client.ts        # x402 支付客户端
```

## 4. 依赖关系

### 4.1 单向依赖原则

上层模块可以依赖下层模块，但下层模块不能依赖上层模块：

**正确依赖方向：**
```
index.ts → tools.ts → gateway-client.ts/x402-client.ts → wallet-bridge/ → 外部服务
```

### 4.2 模块依赖规则

- **index.ts** 依赖 `tools.ts` 和 `wallet-bridge/`
- **tools.ts** 依赖 `gateway-client.ts` 和 `x402-client.ts`
- **gateway-client.ts** 和 **x402-client.ts** 依赖 `wallet-bridge/`
- **wallet-bridge/** 内部模块相互依赖
- **skills/** 目录不依赖任何代码模块（仅 Markdown 文档）

### 4.3 第三方依赖管理

- 使用 `@modelcontextprotocol/sdk` 实现 MCP 协议
- 使用 `@x402/fetch` 和 `@x402/svm` 处理支付
- 使用 `@solana/web3.js` 进行 Solana 区块链操作
- 使用 `fastify` 实现钱包桥接 HTTP 服务器
- 使用 `zod` 进行数据验证
- 避免引入不必要的第三方依赖

## 5. 最佳实践

### 5.1 MCP 工具开发

- 为每个工具定义清晰的输入和输出 schema
- 使用 `zod` 进行输入验证
- 处理工具调用的错误并返回结构化的错误信息
- 遵循 MCP 协议规范
- MCP Tool 返回错误时，使用 `isError: true` 标记
- 提供用户友好的错误信息，包含可操作的建议

**示例：**
```typescript
// tools.ts
import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk';

const walletConnectTool: Tool = {
  name: 'wallet_connect',
  description: 'Connect or create a local wallet',
  inputSchema: z.object({
    name: z.string().optional(),
    passphrase: z.string().optional()
  }),
  handler: async (input) => {
    try {
      // Implementation
      return { connected: true, publicKey: 'wallet-public-key' };
    } catch (error) {
      return { 
        isError: true, 
        message: 'Failed to connect wallet. Please check your passphrase.',
        code: 'WALLET_CONNECT_FAILED'
      };
    }
  }
};
```

### 5.2 与 Gateway 交互

- 所有 Gateway 调用通过 `gateway-client.ts` 的 `GatewayClient` 类
- 不要直接用 fetch 调 Gateway API
- Gateway base URL 从环境变量或配置文件读取

**示例：**
```typescript
// gateway-client.ts
class GatewayClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.GATEWAY_BASE_URL || 'http://localhost:3000';
  }

  async matchTask(task: string) {
    // 正确：使用 GatewayClient 封装
    const response = await fetch(`${this.baseUrl}/v1/public/match`, {
      method: 'POST',
      body: JSON.stringify({ task }),
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  }
}

// 错误：直接调用 Gateway API
// async function badMatchTask(task: string) {
//   const response = await fetch('http://localhost:3000/v1/public/match', {
//     method: 'POST',
//     body: JSON.stringify({ task })
//   });
//   return response.json();
// }
```

### 5.3 x402 支付流程

严格遵循以下支付流程：

1. `GatewayClient.match(task)` → 获取 top agent + endpoint
2. `x402Execute(endpoint, task, signer)` → 内部处理 402 → 签名 → 发送
3. 从 PAYMENT-RESPONSE header 提取 tx_signature, payer, amount
4. `GatewayClient.reportReceipt({ agent_id, tx_signature, ... })`

**示例：**
```typescript
// tools.ts - run_agent_task handler
async function runAgentTaskHandler(input: RunAgentTaskInput) {
  const { task, signer } = input;
  
  // Step 1: Match task to find best agent
  const matchResult = await gatewayClient.match(task);
  const { agent_id, endpoint } = matchResult;
  
  // Step 2: Execute agent task via x402 payment
  const { response, txSignature } = await x402Client.execute(
    endpoint, 
    { task }, 
    signer
  );
  
  // Step 3: Extract payment details from header (handled internally by x402Client)
  
  // Step 4: Report receipt to Gateway
  await gatewayClient.reportReceipt({
    agent_id,
    tx_signature: txSignature,
    task_description: task,
    response_summary: JSON.stringify(response).substring(0, 100)
  });
  
  return { response };
}
```

### 5.4 Wallet Bridge SDK 最佳实践

- 当前产品路径不启动 `localhost:8090` HTTP 服务
- MCP tools 通过进程内 SDK 调用钱包能力
- keypair 文件默认存储在 `~/.agenthub/dev-wallet.json`，可用 `AGENTHUB_WALLET_PATH` 覆盖
- 后续补 AES-256-GCM 加密钱包私钥时，密钥必须从用户密码或安全环境配置派生，不要硬编码

**示例：**
```typescript
const walletBridge = new FileSystemWalletBridge();
const { wallet } = await walletBridge.connectWallet();
const signature = await walletBridge.signMessage(challengeMessage);
```

### 5.5 Skill 文件规范

- 使用 Markdown 格式描述命令的执行步骤
- Claude Code 加载后按步骤调用对应的 MCP Tools
- 修改 Skill 文件不需要重新构建
- 保持 Skill 描述的清晰和简洁

### 5.6 错误处理

- 使用自定义错误类区分不同类型的错误
- 在工具层统一处理错误并格式化响应
- 记录详细的错误信息便于调试
- 避免将敏感信息泄露到错误消息中

**示例：**
```typescript
class WalletError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'WalletError';
  }
}

// In wallet-bridge/wallet.ts
async function unlockWallet(name: string, passphrase: string) {
  try {
    const encryptedData = await fs.promises.readFile(`~/.agenthub/${name}.enc`);
    const decrypted = await decrypt(encryptedData, passphrase);
    return JSON.parse(decrypted);
  } catch (error) {
    logger.error('Failed to unlock wallet', { name });
    throw new WalletError('Failed to unlock wallet. Please check your passphrase.', 'WALLET_UNLOCK_FAILED');
  }
}
```

### 5.7 安全性

- 钱包私钥应加密存储
- 不要在日志中记录敏感信息（私钥、密码等）
- 钱包桥接服务仅监听 localhost
- 使用 HTTPS 保护通信（生产环境）
- 验证所有输入数据，防止注入攻击

### 5.8 性能考虑

- 使用异步/await 处理异步操作
- 实现适当的超时机制
- 缓存频繁使用的数据
- 避免不必要的网络请求
- 对大文件和长时间运行的任务使用异步处理

## 6. 代码审查要点

1. **架构一致性**：是否遵循了分层架构和依赖规则
2. **类型安全**：是否正确使用 TypeScript 类型系统，避免 `any` 类型
3. **错误处理**：是否有适当的错误处理机制，使用自定义错误类
4. **代码质量**：是否符合命名规范和代码风格
5. **安全性**：是否保护敏感信息，遵循安全最佳实践
6. **性能考虑**：是否存在性能瓶颈，是否使用了适当的优化技术
7. **可测试性**：代码是否易于测试，是否使用了依赖注入
8. **文档**：是否有足够的文档和注释，特别是 MCP 工具的文档
9. **MCP 协议合规性**：工具定义是否符合 MCP 协议规范
10. **Gateway 交互**：是否通过 GatewayClient 进行所有 Gateway 调用
11. **支付流程**：是否遵循正确的 x402 支付流程
12. **Wallet Bridge**：是否遵循 Wallet Bridge 的安全和实现规范

## 7. 相关文档

- **项目指南**: `docs/rules/agenthub-plugin.md`
- **项目开发规则**: `/agenthub-plugin/CLAUDE.md`
- **Git 规范**: `docs/rules/git-guidelines.md`
- **环境变量**: `docs/conf/env-variables.md`
- **项目总规范**: `AGENTS.md`
