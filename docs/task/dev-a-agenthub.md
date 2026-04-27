# Dev A 任务清单 — 首页（仅 `/`）

> 分支: `feat/dev-a-agenthub`
> commit 前缀: `feat(dev-a):`
> 工作目录: `agenthub-gateway/`
> 依据文档:
> - `docs/spec/api-dependencies-web-pages.md`
> - 首页原型: `D:\ai开发\agenthub-design-v2\V9 Unauth Home - Modern Light.png`

---

## 首页边界

首页 `/` 是未登录页面，数据与用户登录态无关。

仅使用以下接口：
- `GET /v1/public/market/stats`（首页统计）
- `GET /v1/public/market/agents?sort=rating&order=desc&limit=4&status=active`（Featured Agents）
- `POST /v1/public/match`（Hero 区 Match Agent）

---

## 首页功能点（仅首页）

### H-1 页面结构（按原型）
- [ ] 顶部导航：Logo、Marketplace、Docs、Trust、Blog、Connect Wallet、Become Provider。
- [ ] Hero 区：主标题、副标题、任务输入框、Match Agent 按钮。
- [ ] 平台统计区：4 张统计卡片。
- [ ] Featured Agents 区：精选 Agent 卡片（2x2）。
- [ ] 分类标签区：静态标签入口。
- [ ] Trust Flow 区：5 步流程展示。
- [ ] Footer 区：平台/链上/社区链接。

### H-2 首页数据接入
- [ ] `[首页-Stats]` 接入 `GET /v1/public/market/stats`。
- [ ] `[首页-Featured]` 接入 `GET /v1/public/market/agents?sort=rating&order=desc&limit=4&status=active`。
- [ ] 将首页静态 mock 数据替换为真实接口数据。

### H-3 首页交互
- [ ] `[首页-Match]` Hero 输入框调用 `POST /v1/public/match`。
- [ ] 匹配结果支持弹层或跳转展示。
- [ ] Match 请求失败时给出明确失败提示（不影响页面主体展示）。

### H-4 渲染与容错
- [ ] 首页 stats + featured 使用 SSR。
- [ ] 开启 ISR：`revalidate=300`。
- [ ] stats/featured 任一接口失败时降级显示占位符（如 `—`），页面不白屏。
- [ ] 首页不读取 JWT，不依赖用户身份。

---

## 首页验收标准

1. 未登录访问 `/` 可完整看到首页内容。
2. 统计卡片来自 `GET /v1/public/market/stats` 实时数据。
3. Featured Agents 来自 `GET /v1/public/market/agents`（固定参数：`sort=rating&order=desc&limit=4&status=active`）。
4. Match Agent 可触发 `POST /v1/public/match` 并展示结果。
5. ISR 生效（300s），接口失败时页面可降级展示且不阻塞渲染。
6. 页面结构与 `V9 Unauth Home - Modern Light` 原型一致。

---

*最后更新: 2026-04-21*
