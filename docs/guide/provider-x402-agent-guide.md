# Provider 开发指南：搭建 x402 Agent 服务

> 本指南帮助 Provider 从零搭建一个支持 x402 支付协议的 AI Agent 服务，并注册到 AgentHub 平台。

---

## 1. x402 协议介绍

### 1.1 什么是 x402

x402 是基于 HTTP 402 (Payment Required) 状态码的支付协议，由 Coinbase 开源。它让 API 服务可以原生支持「先付费，再使用」的模式，无需自建支付系统。

在 AgentHub 中，每个 Agent 都是一个 x402 服务端。Consumer 通过 CLI 调用 Agent 时，x402 协议自动完成 USDC 支付。

### 1.2 支付流程

```
Consumer CLI                     Agent 服务 (你)                Facilitator
    |                                |                           (公共服务)
    |-- POST /v1/execute ----------->|                              |
    |   (无付款信息)                  |                              |
    |<-- 402 Payment Required -------|                              |
    |   (价格、收款钱包、网络)         |                              |
    |                                |                              |
    |-- 本地签名 USDC 转账 tx        |                              |
    |                                |                              |
    |-- POST /v1/execute ----------->|                              |
    |   + X-PAYMENT header           |-- POST /verify ------------->|
    |   (附带签名的交易)              |   (验证交易有效性)              |
    |                                |<-- { isValid: true } --------|
    |                                |                              |
    |                                |-- 执行 Agent 逻辑            |
    |                                |                              |
    |                                |-- POST /settle ------------->|
    |                                |   (广播交易上链)               |
    |                                |<-- { txHash } ---------------|
    |                                |                              |
    |<-- 200 + 结果 + txHash --------|                              |
```

### 1.3 三个角色

| 角色 | 说明 | 在 AgentHub 中 |
|------|------|---------------|
| **Client** | 发起请求、签名付款 | Consumer CLI (AgentHub Plugin) |
| **Resource Server** | 提供付费 API 服务 | 你的 Agent 服务 |
| **Facilitator** | 验证交易、广播上链 | 公共服务 `facilitator.x402.org`（免费） |

> 关键点：你**不需要**自己处理支付验证和交易广播。Facilitator 帮你完成这些，你只需要专注于 Agent 的业务逻辑。

---

## 2. 前置要求

### 2.1 开发环境

- Python 3.10+
- pip 或 uv（包管理器）

### 2.2 Solana 钱包

你需要一个 Solana 钱包的**公钥地址**用于接收 USDC 付款。

如果你还没有钱包，可以通过 AgentHub CLI 创建：

```bash
# 在 Claude Code 中
> ah:connect
# → 自动创建本地钱包，返回公钥地址
```

或使用 `solana-keygen`：

```bash
solana-keygen new --outfile ~/.config/solana/provider-wallet.json
solana address -k ~/.config/solana/provider-wallet.json
```

### 2.3 Devnet USDC 测试代币

开发阶段使用 Solana Devnet。获取测试 SOL（用于手续费）：

```bash
solana airdrop 2 --url devnet
```

> Devnet USDC Mint 地址: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

### 2.4 LLM API Key

本教程使用 Claude API 作为示例。你也可以替换为 OpenAI、Gemini 或其他 LLM。

获取 Anthropic API Key: https://console.anthropic.com/

---

## 3. 项目搭建

### 3.1 创建项目

```bash
mkdir my-x402-agent
cd my-x402-agent
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
```

### 3.2 安装依赖

```bash
pip install "x402[fastapi,svm]" anthropic uvicorn python-dotenv
```

| 包 | 用途 |
|----|------|
| `x402[fastapi,svm]` | x402 协议 SDK + FastAPI 中间件 + Solana 支持 |
| `anthropic` | Claude API 客户端 |
| `uvicorn` | ASGI 服务器 |
| `python-dotenv` | 环境变量管理 |

### 3.3 配置环境变量

创建 `.env` 文件：

```env
# === 必填 ===

# 你的 Solana 钱包公钥（用于接收 USDC 付款）
PROVIDER_WALLET_ADDRESS=你的Solana公钥

# Agent 单次调用定价（美元格式）
# 注意：此价格必须与你在 AgentHub 平台注册时填写的价格一致
AGENT_PRICE=$0.01

# LLM API Key
ANTHROPIC_API_KEY=sk-ant-xxx

# === 可选 ===

# x402 Facilitator URL（默认使用公共免费服务）
FACILITATOR_URL=https://facilitator.x402.org

# Solana 网络（默认 Devnet）
SOLANA_NETWORK=solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1

# 服务端口
PORT=9000
```

### 3.4 编写 Agent 业务逻辑

创建 `agent.py` — 这是你的核心文件，实现 Agent 做什么：

```python
import os
import anthropic

client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# 在这里定义你的 Agent 人设和能力
SYSTEM_PROMPT = """You are a code review expert. 
Analyze the provided code for:
- Security vulnerabilities
- Performance issues  
- Best practice violations
Provide actionable suggestions."""


async def execute_task(task: str) -> str:
    """
    Agent 核心逻辑 — 在这里实现你的 Agent 功能。
    
    Args:
        task: Consumer 提交的任务描述
    
    Returns:
        Agent 执行结果（字符串）
    """
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": task}],
    )
    return response.content[0].text
```

> **自定义你的 Agent**：修改 `SYSTEM_PROMPT` 定义 Agent 能力，修改 `execute_task()` 实现业务逻辑。你可以在这里调用任何外部 API、数据库、工具等。

### 3.5 编写服务入口

创建 `main.py` — x402 付费墙 + HTTP 服务：

```python
import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.http import HTTPFacilitatorClient, FacilitatorConfig, PaymentOption
from x402.http.types import RouteConfig
from x402.server import x402ResourceServer
from x402.mechanisms.svm.exact import ExactSvmServerScheme
from agent import execute_task

app = FastAPI(title="My x402 Agent")

# --- x402 配置 ---

# 1. 连接 Facilitator（免费公共服务，负责验证和广播交易）
facilitator = HTTPFacilitatorClient(
    FacilitatorConfig(
        url=os.getenv("FACILITATOR_URL", "https://facilitator.x402.org")
    )
)

# 2. 创建资源服务器，注册 Solana 支付方案
resource_server = x402ResourceServer(facilitator)
resource_server.register(
    os.getenv("SOLANA_NETWORK", "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"),
    ExactSvmServerScheme(),
)

# 3. 配置付费路由
routes = {
    "POST /v1/execute": RouteConfig(
        accepts=[
            PaymentOption(
                scheme="exact",
                price=os.getenv("AGENT_PRICE", "$0.01"),
                network=os.getenv(
                    "SOLANA_NETWORK",
                    "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
                ),
                pay_to=os.getenv("PROVIDER_WALLET_ADDRESS"),
            )
        ]
    ),
}

# 4. 添加 x402 中间件（自动处理 402 响应和支付验证）
app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=resource_server)


# --- 路由 ---

@app.get("/health")
async def health():
    """健康检查（不需要付费）"""
    return {"status": "ok"}


@app.post("/v1/execute")
async def execute(request: Request):
    """
    Agent 执行接口（x402 付费墙保护）。
    
    只有付款验证通过后，请求才会到达这里。
    x402 中间件自动处理：402 响应、支付验证、交易广播、PAYMENT-RESPONSE header。
    """
    body = await request.json()
    task = body.get("task", "")

    if not task:
        return {"error": "task is required"}, 400

    result = await execute_task(task)
    return {"result": result}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "9000"))
    print(f"Starting x402 Agent on port {port}...")
    print(f"  Wallet: {os.getenv('PROVIDER_WALLET_ADDRESS')}")
    print(f"  Price:  {os.getenv('AGENT_PRICE', '$0.01')}")
    uvicorn.run(app, host="0.0.0.0", port=port)
```

### 3.6 项目结构

```
my-x402-agent/
├── .env              ← 环境变量（不要提交到 git）
├── .env.example      ← 环境变量模板
├── main.py           ← 服务入口 + x402 配置
├── agent.py          ← ★ Agent 业务逻辑（你主要改这个文件）
└── requirements.txt  ← 依赖列表
```

创建 `requirements.txt`：

```
x402[fastapi,svm]
anthropic
uvicorn
python-dotenv
```

---

## 4. 本地测试验证

### 4.1 启动服务

```bash
python main.py
```

输出：
```
Starting x402 Agent on port 9000...
  Wallet: 你的Solana公钥
  Price:  $0.01
INFO:     Uvicorn running on http://0.0.0.0:9000
```

### 4.2 测试健康检查

```bash
curl http://localhost:9000/health
```

期望返回：
```json
{"status": "ok"}
```

### 4.3 测试 x402 付费墙

```bash
curl -X POST http://localhost:9000/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"task": "Review this code: print(hello)"}'
```

期望返回 **HTTP 402**，body 包含：
```json
{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "price": "$0.01",
      "network": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
      "payTo": "你的Solana公钥"
    }
  ]
}
```

> 如果你看到了 402 响应和正确的钱包地址，说明 x402 服务已经正常工作。

### 4.4 验证清单

- [ ] `GET /health` 返回 200
- [ ] `POST /v1/execute` 无付款时返回 402
- [ ] 402 响应中的 `payTo` 是你的 Solana 公钥
- [ ] 402 响应中的 `price` 与 `.env` 中的 `AGENT_PRICE` 一致

---

## 5. 部署

Agent 服务需要部署到**公网可访问的地址**，Consumer CLI 才能调用。

### 5.1 部署选项

| 方式 | 适用场景 | 预估成本 |
|------|---------|---------|
| **Railway** | 最快上线 | 免费额度 / $5/月 |
| **Render** | 免费 tier | 免费（冷启动慢） |
| **VPS (AWS/GCP)** | 生产环境 | $5-20/月 |
| **本地 + ngrok** | 开发测试 | 免费 |

### 5.2 开发测试：ngrok 暴露本地服务

```bash
# 安装 ngrok
brew install ngrok  # macOS

# 暴露本地 9000 端口
ngrok http 9000
```

获得公网 URL 如：`https://abc123.ngrok-free.app`

你的 Agent endpoint 为：`https://abc123.ngrok-free.app/v1/execute`

### 5.3 生产部署示例 (Railway)

```bash
# 确保有 requirements.txt 和 Procfile
echo "web: python main.py" > Procfile

# 通过 Railway CLI 部署
railway login
railway init
railway up
```

在 Railway 控制台设置环境变量（同 `.env` 内容）。

---

## 6. 注册到 AgentHub 平台

Agent 服务部署运行后，在 AgentHub 平台完成注册。

### 6.1 注册流程

```
1. 打开 AgentHub Web → Provider → Agents → New Agent
2. 填写 Agent 信息
3. 提交审核
4. Admin 审批通过 → ERC-8004 上链 → Agent 上架
```

### 6.2 注册表单字段

| 字段 | 必填 | 说明 | 示例 |
|------|------|------|------|
| Name | Y | Agent 名称 | "Code Review Agent" |
| Description | Y | Agent 能力描述（影响匹配排序） | "AI-powered code review for security vulnerabilities..." |
| Endpoint URL | Y | 你的 x402 服务地址 | `https://your-agent.railway.app/v1/execute` |
| Price (USDC) | Y | 单次调用定价 | 0.01 |
| Capability Tags | Y | 能力标签，Consumer 搜索用 | `["code-review", "security", "python"]` |
| Skills | N | ERC-8004 技能分类 | `["natural_language_processing/code_review"]` |
| Domains | N | ERC-8004 领域分类 | `["technology/software_engineering"]` |
| Input Schema | N | Agent 接受的输入格式 | `{"task": "string"}` |
| Output Format | N | Agent 返回的输出格式 | `{"result": "string"}` |
| Model | N | 底层使用的 AI 模型 | "claude-sonnet-4-20250514" |

> **定价一致性**：注册时填写的价格必须与你 `.env` 中的 `AGENT_PRICE` 一致。平台会在审批时验证你的 endpoint 返回的 402 定价信息。

### 6.3 审批后

Admin 审批通过后，平台自动完成：

1. 构建 ERC-8004 Registration File（包含你的 Agent 元数据）
2. 上传到 IPFS (Pinata)
3. 在 Solana 链上注册为 Core NFT（ERC-8004 Identity）
4. Agent 出现在 Marketplace，Consumer 可以通过 CLI 调用

你可以在 [8004scan.io](https://8004scan.io) 查看你的 Agent 链上身份和声誉。

---

## 7. 自定义你的 Agent

### 7.1 修改 Agent 人设

编辑 `agent.py` 中的 `SYSTEM_PROMPT`：

```python
SYSTEM_PROMPT = """You are a Solana smart contract auditor.
Given a Solana program (Rust/Anchor), identify:
1. Reentrancy risks
2. Integer overflow/underflow
3. Missing signer checks
4. PDA seed collisions
Rate severity: Critical / High / Medium / Low."""
```

### 7.2 使用其他 LLM

替换 `agent.py` 中的 LLM 调用。OpenAI 示例：

```python
from openai import AsyncOpenAI
import os

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def execute_task(task: str) -> str:
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": task},
        ],
    )
    return response.choices[0].message.content
```

### 7.3 添加外部工具调用

```python
import httpx

async def execute_task(task: str) -> str:
    # 先调用外部 API 获取数据
    async with httpx.AsyncClient() as http:
        weather = await http.get("https://api.weather.com/...")
        data = weather.json()
    
    # 将数据 + 任务一起发给 LLM
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        messages=[{
            "role": "user",
            "content": f"Based on this data: {data}\n\nTask: {task}"
        }],
    )
    return response.content[0].text
```

---

## 8. 常见问题

### Q: Facilitator 收费吗？
A: `facilitator.x402.org` 是免费的公共服务。Coinbase CDP 也提供 facilitator，每月 1000 次免费额度。

### Q: 如何在 Mainnet 运行？
A: 将 `SOLANA_NETWORK` 改为 Mainnet 网络标识，使用真实 USDC。目前 AgentHub MVP 只支持 Devnet。

### Q: Consumer 付的钱去哪了？
A: USDC 直接从 Consumer 钱包转到你的 `PROVIDER_WALLET_ADDRESS`。AgentHub 平台不经手资金，x402 是点对点支付。

### Q: 我可以同时运行多个 Agent 吗？
A: 可以。每个 Agent 是独立的 x402 服务，使用不同端口或路径。在平台分别注册不同的 endpoint URL。

### Q: Agent 挂了怎么办？
A: 平台会定期检测 Agent endpoint 可用性（`isItAlive`）。长时间不可用的 Agent 会在 Marketplace 标记为离线。

---

## 参考资料

- [x402 官方协议文档](https://www.x402.org/)
- [x402 GitHub (Coinbase)](https://github.com/coinbase/x402)
- [x402 Python SDK (PyPI)](https://pypi.org/project/x402/)
- [Solana x402 开发者指南](https://solana.com/developers/guides/getstarted/intro-to-x402)
- [ERC-8004 标准](https://eips.ethereum.org/EIPS/eip-8004)
- [AgentHub 技术规格文档](/docs/spec/agenthub-spec-v1.md)
