# Dev C 阶段任务 — Claude 插件壳 + MCP 内核最小闭环

> 状态: 已分配
> 负责人: Dev C
> 首个目标宿主: Claude Code
> 关联前置阶段: [dev-c-plugin-integration-minimal.md](./dev-c-plugin-integration-minimal.md)
> 关联总任务: [dev-c-plugin-auth.md](../dev-c-plugin-auth.md)
> 最后更新: 2026-04-22

## 1. 阶段目标

在 `wallet_connect` 已经通过本地 `mcpServers` 方式跑通的前提下，为 AgentHub 增加一层 Claude Code 专属插件壳，把用户接入体验从“手动配置本地 MCP server”推进到“插件安装 + 自动加载插件内置 MCP 配置”。

本阶段目标：

- 保留 `agenthub-plugin` 作为正式 MCP server 内核
- 新增“仓库根 marketplace + 子目录 plugin”双层 Claude Code 安装壳
- 插件安装后自动加载内置 `.mcp.json`
- Claude Code 重启后能够发现 `wallet_connect`
- Claude Code 内完成一次真实 `wallet_connect` 验收

## 2. 核心设计

### 2.1 分层结构

- 仓库根 marketplace：负责 GitHub 默认分支安装入口
- Claude 插件壳：负责命令入口、宿主集成包装
- MCP 内核：负责 `wallet_connect`、本地钱包读写、Gateway 调用、JWT cache
- Gateway：负责 challenge / verify 和后续业务 API

### 2.2 通信流程

1. 用户执行 `/plugin install agenthub`
2. Claude Code 从仓库根 marketplace 解析 `agenthub-plugin/` 插件包
3. Claude Code 安装 AgentHub 插件壳
4. Claude Code 根据插件内置 `.mcp.json` 注册 `agenthub-plugin` stdio server
5. 用户重启 Claude Code
6. Claude Code 加载 `wallet_connect`
7. Claude Code 调用 `wallet_connect`
8. `agenthub-plugin` 在本地完成钱包操作、签名、Gateway 认证和 JWT cache

### 2.3 关键约束

- 插件壳不能替代 MCP 内核，只能包装 MCP 内核
- `wallet_connect` 仍是协议层正式 tool 名
- `/agenthub:connect` 只允许作为 Claude 宿主入口命令
- 不把 `wallet_connect` 改写成纯 Claude command 实现
- 不在本阶段引入完整 Wallet Bridge、`wallet_status`、`match_capability`、`run_agent_task`

## 3. 阶段范围

### 3.1 包含范围

- 为 AgentHub 设计“仓库根 marketplace + 子目录 plugin”目录结构
- 增加仓库根 `.claude-plugin/marketplace.json`
- 增加 `.claude-plugin/plugin.json`
- 增加 `commands/connect.md` 或等价命令文档
- 完成一次真实 Claude Code `wallet_connect` 验收
- 回写 README、集成文档、进度文档、任务文档

### 3.2 非范围

- Claude marketplace 正式发布
- 完整 Wallet Bridge 服务化
- `wallet_status`
- `match_capability`
- `market_list`
- `run_agent_task`
- Receipt / Rating
- Dashboard 跳转
- 多宿主通用安装器

## 4. 交付物

### 4.1 代码交付物

- 仓库根 marketplace 清单
- Claude 插件壳目录
- 插件 manifest
- 插件内置 MCP 配置和命令入口
- 必要的单元测试或最小可回归测试

### 4.2 文档交付物

- `agenthub-plugin/README.md`
- `agenthub-plugin/CLAUDE-CODE-INTEGRATION.md`
- 本阶段任务文档
- `docs/progress/dev-c.md`

## 5. 实施拆分

### 5.1 Task A: Claude 插件壳骨架

- 明确根目录 marketplace 与 `agenthub-plugin/` 插件壳的放置位置
- 定义仓库根 `.claude-plugin/marketplace.json`
- 定义 `.claude-plugin/plugin.json`
- 定义 command 命名空间和文档入口

### 5.2 Task B: 插件安装闭环

- 检测插件安装后的运行时依赖是否完整
- 定位 AgentHub MCP server 启动入口
- 校验插件内置 `.mcp.json` 被 Claude Code 正确加载
- 校验 `claude plugin marketplace add <repo-root>` 与 `claude plugin install agenthub` 可用

### 5.3 Task C: connect 宿主入口

- 为 Claude Code 提供清晰的 connect 命令入口
- 明确它与 `wallet_connect` 的关系
- 避免宿主入口和协议层 tool 名混淆

### 5.4 Task D: Claude 真机验收

- 安装插件壳
- Claude 重启
- 发现 `wallet_connect`
- 真实调用一次并记录结果

## 6. 验收标准

- AgentHub 存在仓库根 marketplace manifest 与插件壳 manifest
- Claude Code 能安装 AgentHub 插件壳
- `claude plugin install agenthub` 后能自动加载插件内置 `.mcp.json`
- Claude Code 重启后能发现 `wallet_connect`
- `/agenthub:connect` 能命中插件命令并触发 `wallet_connect`
- `wallet_connect` 在真实 Claude Code 中调用成功
- 文档明确区分：
  - Claude 插件命令入口
  - MCP tool
  - Gateway API

## 7. 风险与应对

### 7.1 风险

- Claude 插件系统对自动配置能力存在边界
- Windows / PowerShell / Git Bash 的路径与 quoting 容易出错
- 插件壳和 MCP 内核目录边界如果不清晰，后续多宿主适配会变乱

### 7.2 应对

- 先做本地安装和本地自动加载可用，不先碰 marketplace 发布
- 保持“Claude 插件壳”和“MCP 内核”职责分离

## 8. 依赖关系

### 8.1 不依赖别人提供

- 不依赖 Dev A / Dev B 新接口
- 不依赖 `match`
- 不依赖 receipts / ratings

### 8.2 当前依赖

- `wallet_connect` 最小闭环保持稳定
- `public-auth` 最小链路保持稳定
- Claude Code 当前插件机制在本地环境可用

## 9. 完成定义

- 根目录 marketplace 与子目录 plugin 双层结构落地
- 插件安装 + 内置 `.mcp.json` 自动加载闭环通过
- Claude Code 真机验收通过
- 文档和 progress 已回写
