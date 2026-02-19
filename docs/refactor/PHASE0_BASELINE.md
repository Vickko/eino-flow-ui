# Phase 0 基线盘点（2026-02-19）

> 适用范围：`eino-flow-ui`  
> 目的：给后续重构提供可对比的“起点数据”。

## 1) 当前功能清单（冻结版）

### 1.1 Graph 调试链路
- Graph 列表加载与搜索（Sidebar + GraphList）
- Graph Canvas 渲染（Vue Flow + Dagre 自动布局）
- 节点详情查看（Inspector）
- Debug Console：输入 JSON、创建线程、SSE 流式日志、节点执行结果回写

### 1.2 Chat 链路
- 会话列表加载、选择、新建本地会话
- 消息发送（文本 + 图片附件）
- SSE 流式回复（含 reasoning、tool call）
- 模型选择与本地模型管理（localStorage）

### 1.3 Auth / 基础能力
- 路由级认证守卫（可通过环境变量开关）
- 主题切换（light/dark/system）
- API 基础地址可配置（localStorage 持久化）
- 心跳检测在线状态

## 2) 构建与运行基线

执行日期：2026-02-19

### 2.1 命令结果
- `npm run type-check`：通过
- `npm run lint`：通过（10 个 warning，0 error）
- `npm run build`：通过（存在 chunk 体积警告）

### 2.2 lint warning 快照（摘要）
- `src/router/index.ts`：7 处 `console.log`
- `src/composables/useAuth.ts`：3 处 `console.log`
- 规则为 `no-console`（允许 warn/error）

### 2.3 build warning 快照（摘要）
- `useAuth.ts` 同时被静态和动态导入，导致动态导入无法独立分块
- 存在超大 chunk（`dist/assets/index-*.js` 超过 1MB）

### 2.4 首屏性能基线（Lighthouse）
- 测量方式：本地 `vite preview` + `lighthouse --preset=desktop`
- 测量 URL：`http://127.0.0.1:4173`
- 报告文件：
  - `docs/refactor/lighthouse-2026-02-19.report.json`
  - `docs/refactor/lighthouse-2026-02-19.report.html`
- 关键指标（2026-02-19）：
  - Performance：`1.00`
  - FCP：`603ms`
  - LCP：`715ms`
  - Speed Index：`603ms`
  - TTI：`715ms`
  - TBT：`0ms`
  - CLS：`0`

## 3) 体积与代码规模基线

### 3.1 产物体积
- `dist` 总体积：`3.6M`
- 最大主包：`dist/assets/index-ersN07Pp.js`（约 `1.2M`）
- 其他较大依赖包：`cytoscape`、`treemap`、`katex`

### 3.2 代码规模
- `src` 总文件数：`47`
- `src` 下 `.vue/.ts` 文件数：`34`
- Top 大文件（按行数）
  - `src/components/chat/MessageBubble.vue`：1194 行
  - `src/composables/useChat.ts`：789 行
  - `src/components/chat/ModelManagementDialog.vue`：683 行
  - `src/components/BottomPanel.vue`：627 行
  - `src/components/Inspector.vue`：608 行
  - `src/components/chat/ChatCard.vue`：589 行
  - `src/components/GraphViewer.vue`：504 行

### 3.3 console 使用基线
- 全项目 `console.*`：35 处
- 主要集中在 `src/api/index.ts`、`src/router/index.ts`、`src/composables/useAuth.ts`

### 3.4 重复逻辑基线（jscpd）
- 扫描命令：`npx jscpd src --min-lines 10 --min-tokens 50 --reporters "console,json"`
- 报告文件：`docs/refactor/jscpd-report/jscpd-report.json`
- 汇总结果：
  - 扫描源文件：`39`
  - 克隆块：`3`
  - 重复行：`53`（`0.73%`）
  - 重复 token：`310`（`0.64%`）
- 主要重复热点：
  - `src/layout/ChatLayout.vue` 与 `src/layout/MainLayout.vue` 的导航按钮区块
  - `src/components/Inspector.vue` 内部重复模板片段
  - `src/api/index.ts` 内部 fetch 配置重复片段

## 4) 风险与问题基线（重构前）

### 4.1 架构与可维护性风险
- 多个 composable 使用模块级共享状态，状态边界不清晰
- 超长文件较多，UI、状态、协议解析耦合明显
- `useChat.ts` 混合了 demo 数据与正式业务逻辑

### 4.2 工程质量风险
- 当前无自动化测试脚本（`package.json` 未配置 test）
- lint 尚有 warning 存量
- 路由非懒加载，首包压力较大

### 4.3 稳定性与性能风险
- 心跳间隔为 500ms，频率偏高
- SSE 解析、消息状态机、会话 ID 替换逻辑复杂，存在竞态风险
- 构建产物出现大 chunk，首屏与缓存策略风险较高

### 4.4 安全风险
- Markdown 渲染链路需补明确净化策略审计
- 页面缺少 CSP 基线配置

## 5) 接口失败场景清单（用于后续回归）

- [ ] 401 未认证：是否只触发一次登录跳转，是否避免循环跳转
- [ ] 后端超时：UI 是否给出可理解提示，是否可重试
- [ ] 断网：Graph/Chat/心跳是否退化为可恢复状态
- [ ] SSE 中断：消息状态是否正确落盘（sent/error），是否可继续会话
- [ ] SSE 粘包/分片：事件解析是否稳定
- [ ] 会话加载失败：是否保留本地临时会话与当前上下文

## 6) 重构验收清单（手工回归版）

> 每个批次完成后，至少回归一次。

### 6.1 Graph 主链路
- [ ] 进入 `/` 后 Graph 列表可加载
- [ ] 选择图后可正常渲染节点与边
- [ ] 选中节点后 Inspector 展示信息正确
- [ ] 运行 Debug 后日志持续输出，节点结果可在 Inspector 看到

### 6.2 Chat 主链路
- [ ] 进入 `/chat` 后会话列表可加载
- [ ] 新建会话并发送文本消息成功
- [ ] 上传图片并发送成功
- [ ] 流式回复结束后消息状态正确、会话标题/最后消息更新正确
- [ ] 手动停止生成后 UI 状态正确

### 6.3 Auth 与基础能力
- [ ] `VITE_ENABLE_AUTH=true` 时，未登录访问受保护路由会跳转登录
- [ ] `VITE_ENABLE_AUTH=false` 时，路由可直接访问
- [ ] 主题切换与刷新持久化正常
- [ ] API 地址修改后生效并可恢复连接

## 7) 说明

- 本文档是 Phase 0 快照，不代表最终架构决策。
- 后续每个阶段完成后，更新本文件顶部日期与关键指标对比。
