# 团队分工与角色

## 1. 角色定义

| 角色代码 | 角色名称 | 负责范围 | 参与项目 |
|---------|---------|--------|--------|
| `dev-a` | Marketplace + Provider 模块开发人员 | Marketplace + Provider（路由、服务、Web 页面、组件） | AgentHub Gateway |
| `dev-b` | Consumer Web + Admin 模块开发人员 | Consumer Web + Admin（路由、服务、Web 页面、组件） | AgentHub Gateway |
| `dev-c` | Plugin 模块 + Consumer Gateway API + Auth 模块开发人员 | Plugin 全部功能开发和维护 + Consumer Gateway API + Auth | AgentHub Gateway、AgentHub Plugin |
| `dev-p` | Harness Engineering 工程师 | harness engineering流程规划，完善各种规范文档 | 所有项目 |
| `admin` | 项目管理员 | Prisma Schema、基建代码（packages/、middleware/、chain/、workers/、layout）、Docker、代码审核、基础设施相关开发工作 | 所有项目 |

## 2. 角色职责说明

### 2.1 `dev-a`: Marketplace + Provider 模块开发人员
- 负责 Agent 市场展示功能的开发和维护
- 负责 Provider（服务提供商）相关功能的开发和维护
- 包括但不限于路由、服务、Web 页面和组件的开发

### 2.2 `dev-b`: Consumer Web + Admin 模块开发人员
- 负责 Consumer（消费者）Web 界面的开发和维护
- 负责 Admin（管理员）界面的开发和维护
- 包括但不限于路由、服务、Web 页面和组件的开发

### 2.3 `dev-c`: Plugin 模块 + Consumer Gateway API + Auth 模块开发人员
- 负责 AgentHub Plugin 的全部功能开发和维护
- 负责 Consumer Gateway API 的开发和维护
- 负责认证系统（Auth）的开发和维护

### 2.4 `dev-p`: Harness Engineering 工程师
- 负责项目的 Harness Engineering 流程规划
- 负责完善各种规范文档
- 确保项目开发流程的规范化和标准化

### 2.5 `admin`: 项目管理员
- 负责 Prisma Schema 的设计和维护
- 负责基础设施代码（packages/、middleware/、chain/、workers/、layout）的开发和维护
- 负责 Docker 环境的配置和维护
- 负责代码审核工作
- 负责基础设施相关的开发工作

## 3. 工作协作规则

1. **跨角色协作**：当需要修改其他角色负责的代码时，必须先与该角色的开发人员沟通
2. **代码审核**：所有代码变更都需要经过代码审核，特别是共享模块和核心功能
3. **文档更新**：角色职责变更时，必须及时更新本文档
4. **进度报告**：各角色需定期更新各自的进度文档（位于 docs/progress/ 目录）