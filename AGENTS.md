# AgentHub - Codex 开发规则

> AI Agent 链上市场平台。ERC-8004 身份 + x402 支付 + IPFS 元数据。

## 启动工作流

在执行任何任务前（包括阅读文档、编写代码、运行命令等），必须严格按照以下顺序执行：
1. 阅读此文件（AGENTS.md）了解项目规范
2. 运行 ./init.sh 初始化项目并验证环境
3. 阅读 feature_list.json 了解当前功能状态

## 项目结构

```
agenthub/                       ← 仓库根目录（不是 monorepo root）
├── agenthub-gateway/          ← 子目录 1：后端 API + Web 前端 + 共享包（pnpm workspace）
├── agenthub-plugin/           ← 子目录 2：Codex MCP Plugin（独立项目）
└── docs/                      ← 设计文档
    ├── spec/                  ← 项目需求文档
    ├── plan/                  ← 执行计划文档
    ├── task/                  ← 执行任务文档
    ├── schema/                ← 数据库设计文档
    ├── ui/                    ← UI设计稿
    ├── rules/                 ← 项目开发规范
    ├── conf/                  ← 配置文件指南
    ├── api/                   ← 前后端交互接口文档
    └── skills/                ← 开发人员使用的技能目录
```

两个子目录是**独立项目**，各自有 package.json。gateway 是 pnpm workspace，plugin 是独立 npm 项目。

所有开发人员使用的 skills 都会通过 `docs/skills` 目录统一管理。
所有项目文档按照类型分目录管理：需求(spec)、计划(plan)、任务(task)、数据库设计(schema)、UI设计稿(ui)、开发规范(rules)、配置文件(conf)和接口文档(api)。

各类文档的编写规范请参考：
- 需求文档规范：`docs/spec/spec-index.md`
- 执行计划规范：`docs/plan/plan-index.md`
- 开发任务规范：`docs/task/task-index.md`
- UI设计稿规范：`docs/ui/ui-index.md`
- API文档规范：`docs/api/api-index.md`
- 数据库设计规范：`docs/schema/schema-index.md`

## 工作规则

1. **每次只开发一个功能** — 遵循 feature_list.json 中的功能定义
2. **开发前必须验证** — 确保 ./init.sh 执行成功
3. **更新进度** — 完成功能或会话结束前更新 feature_list.json 和对应角色的进度文档（位于 docs/progress/ 目录）
4. **遵循代码规范** — 保持与现有代码风格一致
5. **保持仓库可重启** — 确保任何状态都可以通过 ./init.sh 恢复

## 所需工件

- `feature_list.json`: 功能状态跟踪器
- `docs/progress/`: 按角色划分的会话连续性日志目录
- `init.sh`: 标准初始化和验证脚本
- `docs/rules/agenthub-gateway.md`: AgentHub Gateway 子项目说明文档
- `/agenthub-gateway/CLAUDE.md`: AgentHub Gateway 详细开发规范
- `docs/rules/agenthub-plugin.md`: AgentHub Plugin 子项目说明文档
- `/agenthub-plugin/CLAUDE.md`: AgentHub Plugin 详细开发规范

## 完成定义

一个功能完成的标准：
- [ ] 实现代码已完成
- [ ] ./init.sh 验证通过
- [ ] 相关测试已通过
- [ ] feature_list.json 已更新
- [ ] 代码已提交并遵循 Git 规范
- [ ] 仓库可以通过 ./init.sh 重新启动

## 技术栈

详细技术栈请参考各子项目文档：
- AgentHub Gateway: `docs/rules/agenthub-gateway.md`
- AgentHub Plugin: `docs/rules/agenthub-plugin.md`

## 团队分工与角色

详细的团队分工与角色信息请参考：`docs/rules/team-roles.md`

## 全局禁止操作

详细的全局禁止操作明细请参考：`docs/rules/prohibited-operations.md`

## Git 规范

**所有与 Git 相关的操作**（包括但不限于分支创建、代码提交、合并请求、版本发布等）必须：
1. 严格按照 `docs/rules/git-guidelines.md` 文档中的规范进行
2. 仅依据该文档执行，不得使用其他外部 Git 规范

详细的 Git 规范明细请参考：`docs/rules/git-guidelines.md`

## 环境变量

详细的环境变量配置指南请参考：`docs/conf/env-variables.md`
配置文件相关内容统一存放在 `docs/conf/` 目录下。
