# 环境变量配置指南

## 概述

本文件定义了 AgentHub 项目所需的环境变量，包括变量名称、描述和使用场景。

## 配置文件

所有环境变量都应在项目根目录下的 `.env` 文件中配置。可以参考 `.env.example` 文件作为模板。

## 关键环境变量

### 平台钱包配置

- **PLATFORM_WALLET_SECRET_KEY**
  - 描述：平台钱包私钥
  - 用途：用于 Agent 注册和 Feedback 提交等平台级操作
  - 格式：Solana 钱包私钥字符串
  - 安全级别：高（请勿泄露）

### IPFS 配置

- **PINATA_JWT**
  - 描述：Pinata IPFS 服务的 JWT 令牌
  - 用途：用于上传和管理 IPFS 上的元数据
  - 格式：JWT 令牌字符串
  - 安全级别：中（请勿公开）

### 链上配置

- **AGENTHUB_COLLECTION_POINTER**
  - 描述：ERC-8004 Agent Collection 标识
  - 用途：标识 AgentHub 在链上的集合地址
  - 格式：链上地址或指针
  - 安全级别：低（可公开）

### 认证配置

- **JWT_SECRET**
  - 描述：JWT 令牌签发密钥
  - 用途：用于生成和验证用户认证令牌
  - 格式：任意安全的字符串
  - 安全级别：高（请勿泄露）

## 其他环境变量

根据项目的不同模块和部署环境，可能还需要配置其他环境变量：

### Gateway API 配置

- `PORT`: API 服务端口（默认：3000）
- `DATABASE_URL`: 数据库连接 URL
- `NODE_ENV`: 运行环境（development/production）

### Web 前端配置

- `NEXT_PUBLIC_API_URL`: 前端调用的 API 地址
- `NEXT_PUBLIC_WALLET_BRIDGE_URL`: 钱包桥接服务地址

### Plugin 配置

- `AGENTHUB_GATEWAY_URL`: AgentHub Plugin 调用 Gateway 的基础 URL
- `AGENTHUB_WALLET_PATH`: AgentHub Plugin 本地开发态钱包文件路径；未配置时默认 `~/.agenthub/dev-wallet.json`
- `AGENTHUB_X402_MODE`: x402 调用模式，默认 `real`，本地回归可显式设为 `mock`

### Gateway Devnet Faucet 配置

- `AGENTHUB_SOLANA_RPC_URL`: Solana devnet RPC URL，默认 `https://devnet.helius-rpc.com/?api-key=ea3297f1-582d-4b7d-b287-ecd5c8b05ecb`
- `SOLANA_RPC_URL`: 旧字段，当前仅作为兼容回退；新配置统一使用 `AGENTHUB_SOLANA_RPC_URL`
- `AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY`: Gateway 服务端公共 devnet USDC faucet wallet 私钥，当前按 Phantom 常见导出格式使用 base58 字符串
- `AGENTHUB_DEVNET_USDC_MINT`: devnet USDC mint，默认 `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- `AGENTHUB_DEVNET_USDC_AMOUNT`: `/agenthub:faucet` 每次从公共 wallet 转出的 devnet USDC 数量，默认 `10`

## 环境变量管理

### 开发环境

- 在本地开发时，复制 `.env.example` 为 `.env` 并填写相应的值
- 确保 `.env` 文件已添加到 `.gitignore` 中，避免提交到版本控制系统

### 测试环境

- 使用专门的测试环境配置，避免与开发环境冲突
- 测试环境的敏感信息应单独管理

### 生产环境

- 使用安全的环境变量管理服务（如 AWS Secrets Manager、Vercel Environment Variables 等）
- 定期轮换敏感环境变量（如 JWT_SECRET、PLATFORM_WALLET_SECRET_KEY 等）
- 严格控制环境变量的访问权限

## 注意事项

1. 不要在代码中硬编码环境变量值
2. 不要将包含敏感信息的环境变量提交到版本控制系统
3. 开发、测试和生产环境应使用不同的环境变量配置
4. 定期审查和更新环境变量，移除不再使用的变量
5. 确保所有必要的环境变量都已配置，避免运行时错误
