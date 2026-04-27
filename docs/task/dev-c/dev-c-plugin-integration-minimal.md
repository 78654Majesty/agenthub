# Dev C 阶段任务 — 通用 MCP Host 接入最小阶段

> 状态: 实施中
> 负责人: Dev C
> 首个真实验收宿主: Claude Code
> 关联前置阶段: [dev-c-ah-connect-minimal.md](./dev-c-ah-connect-minimal.md)
> 关联总任务: [dev-c-plugin-auth.md](../dev-c-plugin-auth.md)
> 最后更新: 2026-04-21

## 1. 阶段目标

在 `ah:connect` 最小功能闭环和本地联调闭环已经跑通的前提下，把 `agenthub-plugin` 从开发态自测形态推进到通用 MCP host 可接入形态，并以 Claude Code 作为首个真实验收宿主。

本阶段目标：

- `agenthub-plugin` 继续以 stdio MCP server 形态交付
- 正式对外能力固定为 `wallet_connect`
- Claude Code 可以注册并发现 `wallet_connect`
- Claude Code 可以触发一次真实 `wallet_connect`
- `smoke:connect` 明确降级为开发自测入口
- `/agenthub:connect` 明确为 Claude Code 上的用户入口别名策略，而不是协议层标准

## 2. 阶段范围

### 2.1 包含范围

- 明确 `agenthub-plugin` 的正式运行入口与安装方式
- 明确 Claude Code 如何注册这个 MCP server
- 明确 Claude Code 里如何触发 `wallet_connect`
- 明确 `wallet_connect`、`smoke:connect`、`/agenthub:connect` 三者关系
- 补齐通用 MCP host 接入说明和 Claude Code 验收说明
- 形成本阶段的文档化验收路径

### 2.2 非范围

- `match_capability`
- `run_agent_task`
- Receipt / Rating
- 完整 Wallet Bridge
- `wallet_status` 真实余额
- Dashboard 跳转
- workspace 共享基建修复
- 其他 host 的深度适配实现

## 3. 当前输入与前置条件

本阶段建立在以下已完成能力之上：

- [dev-c-ah-connect-minimal.md](./dev-c-ah-connect-minimal.md) 已完成
- `wallet_connect` 已能完成 `challenge -> sign -> verify -> JWT cache`
- `agenthub-plugin` 已可本地 `npm run build`
- `agenthub-gateway/apps/gateway` 已通过主服务提供 `public-auth` canonical 路由（`/v1/public/auth/*`）
- `agenthub-plugin` 已可通过 `npm run smoke:connect` 完成一次真实 smoke 验证

## 4. 核心设计约束

- 跨宿主稳定能力名是 `wallet_connect`，不是 `/agenthub:connect`
- `smoke:connect` 只服务开发与回归测试，不作为最终用户入口
- Claude Code 是首个验收宿主，但文档和架构保持通用 MCP host 视角
- 不能把 Claude Code 的交互约束误写成 MCP 协议标准
- 不能为了适配 Claude Code 而破坏当前 MCP server 的宿主无关结构

## 5. 交付物

本阶段至少交付以下内容：

1. 本阶段任务文档
   [dev-c-plugin-integration-minimal.md](./dev-c-plugin-integration-minimal.md)

2. Claude Code 接入文档
   建议位置：`agenthub-plugin/CLAUDE-CODE-INTEGRATION.md`

3. 通用 MCP host 接入说明
   建议位置：`agenthub-plugin/README.md`

4. 总任务文档与进度日志回写
   [dev-c-plugin-auth.md](../dev-c-plugin-auth.md)
   [dev-c.md](C:\Users\hanchao.wang\repos\hfpay-agenthub-web\docs\progress\dev-c.md)

### 5.1 当前已完成

- 已补 `agenthub-plugin/README.md`
- 已补 `agenthub-plugin/CLAUDE-CODE-INTEGRATION.md`
- 已补 `npm run start`
- 已补 `npm run claude:config`
- 已补 Claude Code MCP 配置生成逻辑与测试
- 已补 Claude 插件壳最小骨架：`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`、`.mcp.json`
- 已补 Claude 命令入口：`commands/connect.md`；当前依赖插件内置 `.mcp.json` 自动加载

### 5.2 当前未完成

- 尚未在真实 Claude Code 宿主内完成一次完整 `wallet_connect` 认证链路验收

## 6. 验收标准

- Claude Code 能注册 `agenthub-plugin` 这个 MCP server
- Claude Code 能发现 `wallet_connect`
- Claude Code 能调用 `wallet_connect`
- 调用结果完成 `challenge -> sign -> verify -> JWT cache`
- 文档明确区分：
  - 正式 tool：`wallet_connect`
  - 开发入口：`smoke:connect`
  - 宿主别名入口：`/agenthub:connect`

## 7. 依赖关系

### 7.1 依赖别人提供

- 不依赖 Dev A / Dev B 的业务接口
- 不依赖 `match`、Receipt、Rating
- 依赖现有 `public-auth` 最小链路继续保持可用

### 7.2 当前风险

- Claude Code 的 MCP 注册方式如果有宿主特定约束，需要单独记录，不应污染通用设计
- 当前仓库存在共享基建问题，本阶段仍不负责修复
- 完整 Wallet Bridge 尚未实现，因此当前宿主接入仍建立在开发态钱包层之上

## 8. 推荐实施顺序

1. 先写 Claude Code 接入文档，明确宿主接入方式
2. 再补通用 MCP host 安装说明，抽出宿主无关部分
3. 最后补 Claude Code 上 `/agenthub:connect` 的入口策略说明

## 9. 与上一阶段的关系

- 上一阶段解决的是“能力能不能跑通”
- 这一阶段解决的是“宿主能不能真正用起来”

因此本阶段不新增业务能力，而是把已有 `ah:connect` 能力推进到正式 plugin 接入层
