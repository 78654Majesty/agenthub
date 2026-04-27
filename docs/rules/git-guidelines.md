# Git 规范明细

## 概述

本文件定义了 AgentHub 项目的 Git 使用规范，所有开发人员必须严格遵守，以确保代码版本管理的一致性和可维护性。

### 角色确认要求

所有 Git 操作（包括分支创建、代码提交、合并请求、版本发布等）必须明确当前角色，只有明确当前角色后，才能：
- 正确操作对应的开发分支
- 使用符合角色要求的 Commit 前缀
- 遵守角色权限限制

**禁止操作其他角色的开发分支**，包括但不限于：
- 创建、修改、删除其他角色的开发分支
- 提交代码到其他角色的开发分支
- 将其他角色的开发分支合并到 feature分支

详细的角色代码定义请参考：`AGENTS.md` 中的 "团队分工与角色" 部分

## 分支命名规范

### 核心分支

| 分支类型 | 命名格式 | 示例 | 说明 |
|---------|---------|------|------|
| 主分支 | `master` | `master` | 生产环境代码分支 |
| feature分支 | `feature-v<版本号>` | `feature-v1`, `feature-v2` | 版本特性整合分支，从 master 分支创建，仅接收开发分支合并 |

### 开发分支

| 分支类型 | 命名格式 | 示例 | 说明 |
|---------|---------|------|------|
| 开发分支 | `<角色>/feature-v<版本号>` | `dev-a/feature-v1`, `dev-b/feature-v2`, `admin/feature-v1` | 所有开发人员的分支，从 feature 分支创建，包含功能开发、修复和基础设施等所有工作内容 |



### 分支管理规则

1. **feature分支**
   - 从 master 分支直接创建，命名格式为 `feature-v<版本号>`
   - 仅接收其他开发分支的合并请求，不允许直接提交代码
   - 版本号从 v1 开始递增

2. **开发分支**
   - 从对应的 feature 分支创建
   - 命名格式为 `<角色>/feature-v<版本号>`，需要包含角色和版本号，不需要包含功能描述或工作类型
   - 开发人员在自己的分支上进行所有工作（功能开发、修复、基础设施等）

3. **合并流程**
   - 开发分支 → feature分支：
     - 只有当前角色可以将自己的开发分支合并至 feature分支，禁止合并其他角色的开发分支
     - 合并前必须先将 feature分支合并到当前开发分支，解决所有冲突后，才能将开发分支合并至 feature分支
     - 合并完成后，**必须将当前工作目录切回原开发分支**
   - feature分支 → master 分支：
     - 只有 admin 角色可以将 feature分支合并至 master 分支进行版本发布
     - 版本开发完成后，通过 PR 合并到 master 分支
     - 合并完成后，**必须将当前工作目录切回原 feature分支**

## Commit 规范

### Commit 前缀

所有 commit 信息必须使用与当前角色对应的前缀，**禁止使用其他角色的前缀**：

| 前缀类型 | 角色前缀 | 示例 | 说明 |
|---------|---------|------|------|
| 新功能 | feat(角色) | `feat(dev-a):`, `feat(dev-b):`, `feat(admin):` | 开发新功能时使用，必须包含当前角色 |
| 修复 | fix(角色) | `fix(dev-a):`, `fix(dev-b):`, `fix(admin):` | 修复问题时使用，必须包含当前角色 |
| 文档 | docs | `docs:` | 更新文档时使用，不区分角色 |
| 杂项 | chore | `chore:` | 执行杂项任务时使用，不区分角色 |

**角色前缀示例**：
- `feat(dev-a):` - Dev A 开发的新功能
- `feat(dev-b):` - Dev B 开发的新功能
- `feat(admin):` - admin 角色开发的基础设施功能
- `fix(dev-a):` - Dev A 修复的问题
- `fix(admin):` - admin 角色修复的基础设施问题

### Commit 信息格式

```
<前缀>: <简短描述>（不超过50个字符）

<详细描述>（可选，用于说明变更的原因和内容）

<关联信息>（可选，如 JIRA 编号、PR 链接等）
```

### 示例

```
feat(dev-a): 实现 Agent 市场列表页面

- 添加了 Agent 卡片组件
- 实现了分页功能
- 添加了搜索过滤功能

关联 PR: #123
```

## PR 规范

### 合并规则

| 规则 | 说明 |
|------|------|
| main 保护 | 必须通过 PR 合入 main 分支 |
| 独占目录 self-merge | 只修改自己负责目录的 PR 可以自行 merge |
| 共享文件审核 | 修改 schema / auth / chain / layout 等共享文件的 PR 需要项目负责人批准 |

### PR 描述要求

- 清晰描述变更的目的和内容
- 说明变更的影响范围
- 关联相关的 issue 或功能需求
- 如有必要，提供测试步骤和截图

## 日常工作流

### 每日同步

- 每天开始工作前，将本地开发分支 rebase 到最新的 feature 分支
- 避免长期持有落后于 feature 分支的开发分支

### 工作流示例

1. **创建 feature分支**（项目负责人操作）
   ```bash
   git checkout master
   git pull origin master
   git checkout -b feature-v1
   git push -u origin feature-v1
   ```

2. **创建开发分支**（开发人员操作）
   ```bash
   git fetch origin
   git checkout feature-v1
   git checkout -b dev-a/feature-v1  # 开发人员分支
   # 或
   git checkout -b admin/feature-v1  # 项目管理员分支
   ```

3. 开发并提交代码（所有类型的工作都使用同一分支）
   ```bash
   git add .
   git commit -m "feat(dev-a): 实现新功能"
   # 或
   git commit -m "fix(dev-a): 修复 bug"
   # 或
   git commit -m "feat(admin): 配置 Docker 环境"
   ```

4. 定期同步 feature分支
   ```bash
   git fetch origin
   git rebase origin/feature-v1
   ```

5. 推送分支并创建 PR 到 feature分支
   ```bash
   git push -u origin dev-a/feature-v1
   ```

6. 代码审查通过后合并到 feature分支

7. **版本发布**（项目负责人操作）
   ```bash
   git checkout feature-v1
   git pull origin feature-v1
   git checkout master
   git merge feature-v1 --no-ff
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin master
   git push origin --tags
   ```

## 冲突解决

- 遇到冲突时，优先使用 rebase 而非 merge 解决
- 确保解决冲突后的代码可以正常构建和运行
- 冲突解决后，重新运行测试确保没有引入新问题

## 标签管理

- 发布版本时使用语义化版本号创建标签
- 标签格式：`v<主版本>.<次版本>.<修订版本>`
- 示例：`v1.0.0`

## 最佳实践

- 频繁提交，每个 commit 只包含一个相关的变更
- 保持 commit 信息清晰、简洁、有意义
- 定期清理本地和远程的废弃分支
- 使用 `.gitignore` 文件排除不必要的文件
- 避免提交敏感信息（如密钥、密码等）
