# AgentHub Auth Connect API

> 文档版本: v1.0
> 文档状态: 已实施
> 创建日期: 2026-04-21
> 更新日期: 2026-04-21
> 创建人: Dev C
> 审核人: 待定

---

## 1. API 概述

- **API 名称**: Auth Connect API
- **API 描述**: 为 `ah:connect` 最小路径提供钱包 challenge/verify 认证能力
- **API 基础 URL**: `https://<your-domain>`（产品占位符）；本地联调可覆盖为 `http://127.0.0.1:18080`
- **认证方式**: 无认证，公共接口
- **请求格式**: JSON / Query String
- **响应格式**: JSON
- **错误处理**: 返回 `{ error }` 文本；更细粒度错误码待统一错误处理中间件接入

---

## 2. 接口列表

| 接口名称 | 路径 | 方法 | 描述 |
|----------|------|------|------|
| 获取登录 Challenge | `/v1/public/auth/challenge` | GET | 为钱包地址生成一次性 challenge |
| 提交签名并换取 JWT | `/v1/public/auth/verify` | POST | 校验 challenge 签名并返回 JWT |

---

## 3. 接口详情

### 3.1 获取登录 Challenge

- **接口路径**: `/v1/public/auth/challenge`
- **请求方法**: `GET`
- **接口描述**: 根据钱包地址生成一条待签名的 challenge 文本
- **认证要求**: 无

#### 查询参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `wallet` | string | 是 | Solana 钱包公钥（base58） |

#### 成功响应

```json
{
  "challenge": "agenthub:login:<nonce>:2026-04-21T10:00:00.000Z",
  "nonce": "abc123",
  "expires_in": 300
}
```

#### 错误响应

```json
{
  "error": "wallet query param is required"
}
```

#### 状态码

- `200` 成功
- `400` 缺少参数

### 3.2 提交签名并换取 JWT

- **接口路径**: `/v1/public/auth/verify`
- **请求方法**: `POST`
- **接口描述**: 校验当前钱包对 challenge 的签名，并返回 JWT
- **认证要求**: 无

#### 请求体

```json
{
  "wallet": "<wallet-pubkey>",
  "signature": "<base64-signature>"
}
```

#### 成功响应

```json
{
  "token": "<jwt>",
  "wallet_pubkey": "<wallet-pubkey>",
  "expires_in": 3600
}
```

#### 错误响应

```json
{
  "error": "wallet and signature are required"
}
```

#### 状态码

- `200` 成功
- `400` 缺少参数
- `500` challenge 不存在、challenge 过期、签名无效等服务层异常

---

## 4. 数据模型

### 4.1 ChallengeResponse

| 字段 | 类型 | 描述 |
|------|------|------|
| `challenge` | string | 待签名消息 |
| `nonce` | string | 一次性随机值 |
| `expires_in` | number | 过期秒数，当前固定为 300 |

### 4.2 VerifyResponse

| 字段 | 类型 | 描述 |
|------|------|------|
| `token` | string | 钱包 JWT |
| `wallet_pubkey` | string | 钱包公钥 |
| `expires_in` | number | JWT 有效期秒数，当前固定为 3600 |

---

## 5. 认证流程

1. Plugin 创建或加载本地开发态钱包
2. Plugin 请求 `/v1/public/auth/challenge`
3. Plugin 本地签名 `challenge`
4. Plugin 请求 `/v1/public/auth/verify`
5. Plugin 将返回的 JWT 缓存在内存中

---

## 6. 当前限制

- 当前文档只覆盖 `ah:connect` 最小路径
- 产品路径预期使用远端 `public-auth` 服务
- 当前开发联调统一通过 Gateway 主服务进行（`agenthub-gateway/apps/gateway` 的 `pnpm start:dev`）
- 还未覆盖 Web 登录、Admin 登录、`ah:dashboard` token 交换
- 错误响应尚未接入统一错误码结构
- API 文档中的返回字段以当前实现为准，后续若补充 `is_new`、余额字段，需要同步更新

---

## 7. 变更日志

| 版本 | 日期 | 变更内容 | 变更人 |
|------|------|----------|--------|
| v1.0 | 2026-04-21 | 首次补充 `ah:connect` 最小路径的 auth API 文档 | Dev C |
