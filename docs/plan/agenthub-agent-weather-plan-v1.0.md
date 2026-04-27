# AgentHub Agent Weather 执行计划（Python + x402）

## 1. 文档信息

| 字段 | 内容 |
|------|------|
| 文档标题 | AgentHub Agent Weather 执行计划 |
| 文档版本 | v1.0 |
| 文档状态 | 已批准 |
| 创建日期 | 2026-04-22 |
| 更新日期 | 2026-04-22 |
| 创建人 | Codex（协同 Fang） |
| 审核人 | Fang |

## 2. 计划概述

### 2.1 关联需求

- [agenthub-spec-v1.md](/Users/fang/Documents/work/huifu/workspace/hfpay-agenthub-web/docs/spec/agenthub-spec-v1.md)
- [provider-x402-agent-guide.md](/Users/fang/Documents/work/huifu/workspace/hfpay-agenthub-web/docs/guide/provider-x402-agent-guide.md)
- [AGENTS.md](/Users/fang/Documents/work/huifu/workspace/hfpay-agenthub-web/AGENTS.md)

### 2.2 计划目标

- 在仓库根目录新增独立应用 `agenthub-agent-weather`。
- 使用 Python 实现可真实对接的 x402 Provider Agent。
- 提供“按城市查询当前天气”能力（MVP）。
- 支持 Solana Devnet + USDC 的原生 x402 支付流程。
- 与 AgentHub 的现有流程对齐：Plugin 直接付费调用，Gateway 负责市场配置与 receipt 体系。

### 2.3 计划范围

- 新建 Python 应用脚手架、配置、依赖与运行命令。
- 实现 `/health` 与付费执行接口（建议 `/v1/execute`）。
- 实现 x402 402 challenge、支付验证、交易广播与 `PAYMENT-RESPONSE` 返回。
- 集成天气数据源（城市名输入）。
- 提供本地可验证测试与文档（README + curl 示例 + 验收清单）。

### 2.4 非范围

- 不改动 Gateway/Plugin 的核心业务逻辑。
- 不引入 Mainnet、多链、多代币扩展。
- 不实现复杂天气能力（历史天气、7天预报、多语言扩展）。
- 不在本计划内实现生产级高可用部署（仅提供基础部署建议）。

### 2.5 依赖关系

- Solana Devnet 可用 RPC。
- x402 Python SDK 可用。
- Provider 钱包与 Devnet USDC 准备完成。
- Gateway 已具备 agent 上架与价格管理能力（用于价格同步来源）。

### 2.6 风险评估与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 价格源与 x402 challenge 金额不一致 | 交易校验失败/用户体验不一致 | 以 Gateway 为价格源，Agent 启动与定时刷新缓存并校验 |
| Devnet 波动导致确认延迟 | 请求耗时升高 | 设置确认超时与明确错误码，支持重试 |
| 天气 API 不稳定 | Agent 可用性下降 | 增加超时、降级提示、可切换数据源 |
| 依赖安装/网络受限 | 本地初始化失败 | 保留离线开发说明与最小依赖锁定 |

## 3. 里程碑规划

| 里程碑 ID | 里程碑名称 | 里程碑描述 | 完成条件 | 计划完成时间 |
|-----------|-----------|-----------|----------|--------------|
| MILESTONE-AGENT-WEATHER-001 | 应用骨架完成 | 完成 Python 项目结构、配置与启动流程 | 本地可启动，`/health` 返回 200 | 2026-04-23 |
| MILESTONE-AGENT-WEATHER-002 | x402 支付闭环完成 | 实现 challenge、支付验证、广播、响应头回传 | 能通过 x402 流程完成一次真实支付调用 | 2026-04-23 |
| MILESTONE-AGENT-WEATHER-003 | 天气能力与文档完成 | 城市天气查询可用并形成使用文档 | README + 测试脚本 + 验收清单齐备 | 2026-04-24 |

## 4. 阶段划分

| 阶段 ID | 阶段名称 | 阶段描述 | 阶段目标 | 阶段范围 | 开始时间 | 结束时间 | 交付物 |
|---------|---------|----------|----------|----------|----------|----------|--------|
| PHASE-AGENT-WEATHER-001 | 工程初始化 | 新建应用并完成依赖、配置、基础路由 | 服务可运行 | 应用结构、配置、健康检查 | 2026-04-22 | 2026-04-23 | `agenthub-agent-weather` 初始代码 |
| PHASE-AGENT-WEATHER-002 | 支付链路实现 | 接入 x402 server scheme 与 Solana Devnet | 支付链路可用 | 402 challenge、支付验证、交易处理 | 2026-04-23 | 2026-04-23 | 可真实支付的执行接口 |
| PHASE-AGENT-WEATHER-003 | 业务能力与验收 | 完成天气查询能力与质量验证 | 可演示可验收 | 天气查询、错误处理、测试文档 | 2026-04-23 | 2026-04-24 | README、测试、验收记录 |

## 5. 任务分解

| 任务 ID | 任务名称 | 任务描述 | 关联需求 | 负责人 | 开始时间 | 结束时间 | 优先级 | 依赖任务 | 交付物 |
|--------|---------|----------|----------|--------|----------|----------|--------|----------|--------|
| TASK-AGENT-WEATHER-001 | 新建应用目录 | 在仓库根目录新增 `agenthub-agent-weather` | spec §13/§14 | Dev C | 2026-04-22 | 2026-04-22 | 高 | 无 | 目录与基础文件 |
| TASK-AGENT-WEATHER-002 | Python 脚手架与依赖 | 选定 FastAPI + Uvicorn + x402 Python SDK | guide §3 | Dev C | 2026-04-22 | 2026-04-22 | 高 | 001 | `pyproject.toml`/`requirements.txt` |
| TASK-AGENT-WEATHER-003 | 配置模型 | 环境变量、网络、钱包、超时配置统一管理 | guide §3.3 | Dev C | 2026-04-22 | 2026-04-22 | 高 | 002 | `.env.example` + 配置模块 |
| TASK-AGENT-WEATHER-004 | 健康检查接口 | 提供 `/health` 路由 | guide §4.2 | Dev C | 2026-04-22 | 2026-04-22 | 中 | 003 | 健康检查实现 |
| TASK-AGENT-WEATHER-005 | x402 付费路由 | 实现 `/v1/execute` 的 402 challenge 和支付受保护执行 | spec §3.1/§13 | Dev C | 2026-04-23 | 2026-04-23 | 高 | 003 | x402 中间件与路由 |
| TASK-AGENT-WEATHER-006 | 价格同步机制 | Agent 运行时从 Gateway 同步价格并用于 challenge | 用户确认链路 | Dev C | 2026-04-23 | 2026-04-23 | 高 | 005 | 价格同步与缓存模块 |
| TASK-AGENT-WEATHER-007 | 天气服务实现 | 输入 city，输出当前天气结构化结果 | 用户需求 | Dev C | 2026-04-23 | 2026-04-23 | 高 | 005 | `weather_client` 与业务服务 |
| TASK-AGENT-WEATHER-008 | 错误码与异常处理 | 参数错误、支付错误、上游异常统一返回 | spec §12 | Dev C | 2026-04-23 | 2026-04-23 | 中 | 005/007 | 错误处理中间件 |
| TASK-AGENT-WEATHER-009 | 测试与验证脚本 | 单测/集成测试与 curl 验证步骤 | guide §4 | Dev C | 2026-04-24 | 2026-04-24 | 高 | 004/005/007 | `tests/` + 验证脚本 |
| TASK-AGENT-WEATHER-010 | 文档与交付 | 完成 README、运行步骤、联调说明、验收清单 | AGENTS 完成定义 | Dev C | 2026-04-24 | 2026-04-24 | 高 | 009 | 文档与演示指引 |

## 6. 资源分配

### 6.1 人力资源

| 角色 | 职责 |
|------|------|
| Dev C（执行） | Python Agent 开发、x402 集成、测试与文档 |
| Fang（评审） | 业务链路确认、关键决策、验收批准 |

### 6.2 技术资源

- Python 3.11+ / FastAPI / Uvicorn
- x402 Python SDK（FastAPI + SVM）
- Solana Devnet RPC
- 天气数据 API（默认免 Key 方案，可切换）
- 可选 ngrok 用于外部联调

### 6.3 预算与成本

- 开发环境预算：0（本地开发）
- 链上成本：Devnet 测试资产
- 第三方 API：优先使用免 Key 数据源

## 7. 进度跟踪

- 跟踪频率：每完成一个阶段更新一次。
- 跟踪载体：
  - `feature_list.json`（功能状态）
  - `docs/progress/`（会话连续性日志）
  - 本计划文档的状态字段与变更记录
- 偏差机制：若单阶段延期超过 0.5 天，立即更新计划并标注原因与调整方案。

## 8. 质量保证

### 8.1 验收标准

- 应用可通过标准命令启动。
- `GET /health` 返回 200。
- 未支付访问付费路由时返回标准 402 challenge。
- 完成支付后可返回天气结果与 `PAYMENT-RESPONSE`。
- `city` 参数缺失或非法时返回明确错误。
- README 包含本地运行、联调、常见问题与验收步骤。

### 8.2 测试策略

- 单元测试：参数校验、天气转换逻辑、价格缓存逻辑。
- 集成测试：付费路由 challenge/支付/响应流程。
- 手工验收：与 Plugin 进行一次端到端调用验证。

### 8.3 完成定义映射

- 实现代码完成。
- 初始化验证通过（按仓库 `init.sh` 要求执行并记录结果）。
- 相关测试通过。
- `feature_list.json` 与 `docs/progress/` 更新完成。
- 仓库保持可重启。

## 9. 变更记录

| 变更ID | 变更内容 | 变更原因 | 变更日期 | 变更人 | 审批人 | 影响 |
|--------|----------|----------|----------|--------|--------|------|
| CHG-AGENT-WEATHER-001 | 新建本计划文档 v1.0 | 启动 `agenthub-agent-weather` 开发前对齐执行路径 | 2026-04-22 | Codex | Fang | 无 |
