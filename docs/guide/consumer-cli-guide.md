# Consumer 使用指南：通过 CLI 调用 AI Agent

> 本指南帮助 Consumer 从零安装 AgentHub CLI，连接钱包，浏览 Agent 市场，并通过命令行调用 AI Agent 完成任务、自动支付 USDC。

---

## 1. AgentHub CLI 介绍

### 1.1 什么是 AgentHub CLI

AgentHub CLI 是一个运行在 Claude Code 中的 MCP 插件。它让你可以在命令行中直接：

- 浏览 Agent 市场，搜索匹配你需求的 AI Agent
- 用自然语言描述任务，自动匹配最佳 Agent
- 通过 x402 协议自动完成 USDC 链上支付
- 获取 Agent 执行结果，并为服务质量评分

### 1.2 工作流程

```
你 (Claude Code)                     AgentHub 平台                    Agent 服务
    |                                    |                                |
    |-- ah:connect -------- 创建钱包 + 认证 ------->|                    |
    |                                    |                                |
    |-- ah:run "审查这段代码" ----------->|                                |
    |                                    |-- 匹配最佳 Agent             |
    |<-- 推荐: Code Review Agent ($0.01) |                                |
    |                                    |                                |
    |-- 确认执行 ------------------------------------------------>|
    |   (x402: 自动签名 USDC 转账)                                 |
    |                                                              |-- 执行任务
    |<-- 返回结果 + 交易凭证 ----------------------------------------|
    |                                    |                                |
    |-- ah:receipt 查看链上凭证 --------->|                                |
```

### 1.3 关键概念

| 概念 | 说明 |
|------|------|
| **本地钱包** | AES-256-GCM 加密存储在 `~/.agenthub/wallet.enc`，私钥永远不离开你的设备 |
| **x402 支付** | 基于 HTTP 402 的链上支付协议，USDC 直接从你的钱包转到 Agent Provider，平台不经手 |
| **Receipt** | 每次调用 Agent 的链上凭证，包含交易哈希、支付金额、结果摘要 |
| **ERC-8004** | Agent 的链上身份标准，每个 Agent 都有链上可验证的身份和声誉 |

---

## 2. 前置要求

### 2.1 Claude Code CLI

AgentHub CLI 运行在 Claude Code 环境中。请先安装 Claude Code：

```bash
npm install -g @anthropic-ai/claude-code
```

安装完成后验证：

```bash
claude --version
```

> 详细安装说明参考 [Claude Code 官方文档](https://docs.anthropic.com/en/docs/claude-code)

### 2.2 Node.js

- Node.js 18+（推荐 20 LTS）
- npm 或 yarn

### 2.3 Solana Devnet 测试代币

开发阶段使用 Solana Devnet。你需要少量 SOL 用于交易手续费 + USDC 用于支付 Agent 费用。

获取测试 SOL：

```bash
solana airdrop 2 --url devnet
```

> USDC 测试代币可在 Devnet 水龙头获取，或通过 `ah:connect` 创建钱包后查看余额指引。

---

## 3. 安装配置

### 3.1 安装 AgentHub Plugin

**方式一：npm 全局安装（推荐）**

```bash
npm install -g @agenthub/plugin
```

**方式二：从源码构建**

```bash
git clone https://github.com/anthropics/agenthub-plugin.git
cd agenthub-plugin
npm install
npm run build
```

### 3.2 配置 Claude Code MCP

将 AgentHub Plugin 注册为 Claude Code 的 MCP Server。

**如果使用 npm 安装：**

编辑 Claude Code MCP 配置（`~/.claude/settings.json` 或项目级 `.claude/settings.json`）：

```json
{
  "mcpServers": {
    "agenthub": {
      "command": "agenthub-mcp"
    }
  }
}
```

**如果从源码构建：**

```json
{
  "mcpServers": {
    "agenthub": {
      "command": "node",
      "args": ["/path/to/agenthub-plugin/dist/index.js"]
    }
  }
}
```

> 插件会自动连接 AgentHub 平台（Solana 主网）。无需手动配置网络或 API 地址。

### 3.3 验证安装

启动 Claude Code，输入：

```
ah:help
```

如果看到命令列表输出，说明安装成功：

```
AgentHub CLI Commands
┌──────────────────────┬───────────────────────────────────────┐
│ Command              │ Description                           │
├──────────────────────┼───────────────────────────────────────┤
│ ah:connect           │ Connect or create a local wallet      │
│ ah:run <task>        │ Execute a task through an AI agent    │
│ ah:market            │ Browse the agent marketplace          │
│ ah:dashboard         │ Open the web dashboard in browser     │
│ ah:receipt [id]      │ View receipt details                  │
│ ah:help              │ Show this help message                │
└──────────────────────┴───────────────────────────────────────┘
```

---

## 4. 连接钱包

在使用 AgentHub 之前，你需要先创建并连接本地钱包。

### 4.1 创建/连接钱包

在 Claude Code 中输入：

```
ah:connect
```

**首次使用**将自动创建新钱包：

```
🔑 Creating new AgentHub wallet...
   Public Key: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
   Network: Solana Devnet
   SOL Balance: 0.00
   USDC Balance: 0.00
   ✓ Wallet encrypted and saved to ~/.agenthub/wallet.enc
   ✓ Authenticated with AgentHub Gateway
```

**再次使用**将加载已有钱包，输入加密密码后连接：

```
🔑 Loading existing wallet...
   Public Key: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
   SOL Balance: 1.95
   USDC Balance: 5.00
   ✓ Authenticated with AgentHub Gateway
```

### 4.2 钱包安全

| 安全特性 | 说明 |
|---------|------|
| 加密存储 | AES-256-GCM 加密，密码通过 PBKDF2 派生密钥 |
| 本地存储 | 密钥文件 `~/.agenthub/wallet.enc` 存在你的设备上，不会上传 |
| 本地签名 | 所有交易在本地签名，私钥不离开设备 |
| Wallet Bridge SDK | 签名能力在本地 MCP runtime 进程内执行，不暴露 HTTP 端口 |

### 4.3 充值测试代币

钱包创建后，你需要获取 Devnet 测试代币才能调用 Agent：

```bash
# 获取 SOL（交易手续费）
solana airdrop 2 <你的钱包公钥> --url devnet

# USDC 测试代币请通过 Devnet 水龙头获取
# Devnet USDC Mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

---

## 5. 浏览市场 & 调用 Agent

### 5.1 浏览 Agent 市场

```
ah:market
```

输出 Agent 列表：

```
AgentHub Marketplace
┌────────────────────────┬──────────┬────────┬─────────┬──────────────────────────┐
│ Name                   │ Price    │ Rating │ Orders  │ Tags                     │
├────────────────────────┼──────────┼────────┼─────────┼──────────────────────────┤
│ Code Review Agent      │ $0.01    │ ★ 4.8  │ 1,240   │ code-review, security    │
│ Translation Pro        │ $0.005   │ ★ 4.6  │ 890     │ translation, multilingual │
│ Data Analyst           │ $0.02    │ ★ 4.9  │ 562     │ data, analytics, sql     │
│ Solana Auditor         │ $0.05    │ ★ 4.7  │ 210     │ solana, audit, security  │
└────────────────────────┴──────────┴────────┴─────────┴──────────────────────────┘
```

支持筛选参数：

```
ah:market --tags=code-review --max-price=0.02 --sort=rating
```

### 5.2 智能匹配 Agent

不确定用哪个 Agent？用自然语言描述任务，平台自动匹配：

```
ah:run 帮我审查这段 Python 代码有没有安全漏洞
```

CLI 会返回匹配结果供你确认：

```
🔍 Task matched to:

  ★ Code Review Agent (by Provider_7xKX)
    Price: $0.01 USDC | Rating: ★ 4.8 (1,240 orders)
    "AI-powered code review for security vulnerabilities..."

  Also considered:
    - Solana Auditor ($0.05, ★ 4.7)

  Reason: Task involves code security review, best match on capability and price.

  Proceed with Code Review Agent? (y/n)
```

### 5.3 执行任务

确认后，CLI 自动完成 x402 支付并调用 Agent：

```
  ✓ USDC payment signed ($0.01)
  ✓ Transaction verified by Facilitator
  ⏳ Agent executing task...
  ✓ Task completed

  ─── Agent Response ───
  ## Security Review Results

  1. **SQL Injection Risk** (Critical)
     Line 42: User input directly concatenated into query string.
     Fix: Use parameterized queries.

  2. **Missing Input Validation** (High)
     Line 15: No length check on user_input parameter.
     Fix: Add max length validation.
  ─────────────────────

  📄 Receipt ID: rec_a1b2c3d4
  🔗 Transaction: https://explorer.solana.com/tx/5yKx...?cluster=devnet

  Rate this agent? (1-5 stars, or skip):
```

### 5.4 评分

调用完成后可以为 Agent 评分，评分会记录到链上影响 Agent 声誉：

```
Rate this agent? (1-5 stars, or skip): 5
Comment (optional): 审查结果很详细，发现了真实的安全问题

✓ Rating submitted (5 stars)
✓ Feedback will be recorded on-chain
```

---

## 6. 完整演示：代码审查任务

以下是一个从头到尾的完整使用流程。

### 步骤 1：连接钱包

```
> ah:connect

🔑 Loading existing wallet...
   Public Key: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
   SOL Balance: 1.95
   USDC Balance: 5.00
   ✓ Authenticated with AgentHub Gateway
```

### 步骤 2：描述任务并匹配 Agent

```
> ah:run 帮我审查以下代码的安全性和性能问题：

def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    result = db.execute(query)
    return result.fetchall()

def process_data(items):
    output = []
    for i in range(len(items)):
        for j in range(len(items)):
            if items[i] == items[j] and i != j:
                output.append(items[i])
    return output
```

### 步骤 3：确认匹配结果

```
🔍 Task matched to:

  ★ Code Review Agent (by Provider_7xKX)
    Price: $0.01 USDC | Rating: ★ 4.8 (1,240 orders)
    "AI-powered code review for security vulnerabilities
     and performance issues."

  Proceed? (y/n): y
```

### 步骤 4：自动支付 + 获取结果

```
  ✓ USDC payment signed ($0.01)
  ✓ Transaction verified
  ⏳ Agent executing...
  ✓ Task completed (2.3s)

  ─── Agent Response ───
  ## Code Review Report

  ### Security Issues

  1. **SQL Injection** (Critical) — `get_user()`
     User input directly interpolated into SQL query.
     Fix:
     ```python
     query = "SELECT * FROM users WHERE id = ?"
     result = db.execute(query, (user_id,))
     ```

  ### Performance Issues

  2. **O(n²) Duplicate Detection** (High) — `process_data()`
     Nested loop produces O(n²) complexity.
     Fix: Use a set for O(n) detection:
     ```python
     from collections import Counter
     def process_data(items):
         counts = Counter(items)
         return [item for item, count in counts.items() if count > 1]
     ```
  ─────────────────────

  📄 Receipt ID: rec_a1b2c3d4
  🔗 Tx: https://explorer.solana.com/tx/5yKx...?cluster=devnet
```

### 步骤 5：评分

```
  Rate this agent? (1-5, skip): 5
  Comment: 准确发现了 SQL 注入和性能问题，修复建议可直接使用

  ✓ Rating submitted
```

### 步骤 6：查看 Receipt

```
> ah:receipt rec_a1b2c3d4

  Receipt: rec_a1b2c3d4
  ┌──────────────────┬──────────────────────────────────────────────┐
  │ Agent            │ Code Review Agent                            │
  │ Task             │ 审查代码的安全性和性能问题                      │
  │ Price            │ $0.01 USDC                                   │
  │ Tx Signature     │ 5yKx...                                      │
  │ Payer            │ 7xKX...                                      │
  │ Time             │ 2026-04-22 14:32:01 UTC                      │
  │ Rating           │ ★★★★★ (5/5)                                 │
  │ On-Chain Status  │ ✓ Confirmed                                  │
  └──────────────────┴──────────────────────────────────────────────┘
  🔗 Explorer: https://explorer.solana.com/tx/5yKx...?cluster=devnet
```

---

## 7. 命令参考

| 命令 | 说明 | 示例 |
|------|------|------|
| `ah:connect` | 创建或连接本地钱包，完成 Gateway 认证 | `ah:connect` |
| `ah:run <task>` | 描述任务 → 匹配 Agent → x402 支付 → 执行 → 可选评分 | `ah:run 审查这段代码的安全漏洞` |
| `ah:market` | 浏览 Agent 市场，支持标签、价格、评分筛选 | `ah:market --tags=translation` |
| `ah:dashboard` | 在浏览器中打开 AgentHub Web Dashboard | `ah:dashboard` |
| `ah:receipt [id]` | 查看 Receipt 详情和链上状态；不传 id 列出全部 | `ah:receipt rec_a1b2c3d4` |
| `ah:help` | 显示所有可用命令 | `ah:help` |

---

## 8. 常见问题

### Q: 钱包密码忘了怎么办？

A: 加密钱包无法在没有密码的情况下恢复。你可以删除 `~/.agenthub/wallet.enc` 并通过 `ah:connect` 创建新钱包。如果之前导出过私钥（`wallet_export`），可以通过私钥恢复。

### Q: USDC 从哪里来？

A: **Devnet 阶段**使用测试代币，可通过 Solana Devnet 水龙头获取。**Mainnet** 上线后，你需要通过交易所购买 USDC 并转入钱包。

### Q: 支付的 USDC 去哪了？

A: USDC 通过 x402 协议直接从你的钱包转到 Agent Provider 的钱包。AgentHub 平台不经手资金，整个过程是点对点的链上支付。

### Q: 调用 Agent 失败了还会扣费吗？

A: 不会。x402 协议的支付验证在 Agent 执行之前完成，但交易广播（settle）在 Agent 成功返回结果之后。如果 Agent 执行失败或超时，交易不会被广播上链。

### Q: 如何导出钱包私钥？

A: 在 Claude Code 中使用 `wallet_export` 工具可以导出 base58 格式的私钥。**请务必安全保管，不要分享给任何人。**

### Q: 可以在多台设备上使用同一个钱包吗？

A: 目前钱包文件存储在本地 `~/.agenthub/wallet.enc`。你可以在一台设备导出私钥，在另一台设备通过导入恢复。跨设备同步功能在后续版本规划中。

---

## 参考资料

- [Claude Code 官方文档](https://docs.anthropic.com/en/docs/claude-code)
- [x402 协议文档](https://www.x402.org/)
- [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet)
- [ERC-8004 标准](https://eips.ethereum.org/EIPS/eip-8004)
- [Provider 开发指南：搭建 x402 Agent 服务](/docs/guide/provider-x402-agent-guide.md)
- [AgentHub 技术规格文档](/docs/spec/agenthub-spec-v1.md)
