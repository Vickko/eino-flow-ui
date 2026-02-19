# 前端重构与清洁计划（跟踪版）

> 项目：eino-flow-ui  
> 创建日期：2026-02-19  
> 目标：在不破坏现有核心功能的前提下，完成可维护、可测试、可扩展的工程化重构。  
> 使用方式：每完成一项就勾选，并在“执行日志”记录日期与结果。

## 0. 约束与原则

- [ ] 每个阶段结束必须可运行：`npm run type-check`、`npm run lint`、`npm run build` 全通过
- [ ] 重构过程按“小步提交、可回滚”执行，禁止一次性大爆改
- [ ] 每次改动要带最小必要测试或验证脚本
- [ ] UI 行为变更必须记录在本文件“变更说明”
- [ ] 涉及接口协议变更时，先出兼容方案再改代码

## 1. 全局盘点与基线（Phase 0）

### 1.1 基线冻结
- [x] 建立重构分支（如 `refactor/frontend-cleanup`）
- [x] 记录当前功能清单（Graph、Debug、Chat、Auth、Theme）
- [x] 记录当前已知问题与风险（从 `AUDIT.md` + 现状补充）
- [x] 建立“重构验收清单”（核心路径可手工回归）

### 1.2 度量与观测
- [x] 建立体积基线（构建产物大小、首屏加载时间）
- [x] 建立代码基线（文件数量、超长文件、重复逻辑）
- [x] 建立错误基线（console error/warn 清单）
- [x] 建立接口失败场景清单（401、超时、断网、SSE中断）

## 2. 目录与分层重构（Phase 1）

### 2.1 目标结构
- [x] 按功能域重排目录：`features/graph`、`features/chat`、`features/auth`
- [x] 抽离通用层：`shared/ui`、`shared/lib`、`shared/types`、`shared/api`
- [x] 保留兼容导出层，避免一次改完所有 import

### 2.2 依赖方向治理
- [x] 明确依赖方向：feature -> shared，不允许反向引用
- [x] 消除循环依赖（重点：api 与 auth/composable 的相互引用）
- [x] 制定 import 规则（统一 `@/` 别名）并用 lint 固化

### 2.3 路由与页面入口
- [x] 路由改为懒加载页面级组件
- [x] 将 `MainLayout`、`ChatLayout` 作为 page-shell，业务逻辑下沉到 feature
- [x] 补路由级错误页/兜底页

## 3. 状态管理重构（Phase 2）

### 3.1 引入统一状态容器
- [ ] 引入 Pinia（或等效方案）
- [ ] 建立 `authStore`、`graphStore`、`chatStore`、`uiStore`
- [ ] 将模块级 `ref` 单例迁移到 store（保留过渡适配）

### 3.2 状态边界清理
- [ ] 把“可持久化状态”与“页面临时状态”分开
- [ ] 为本地存储建立统一封装（key、版本、迁移）
- [ ] 清理跨组件隐式共享状态（如 nav button、theme、server status）

### 3.3 并发与竞态
- [ ] 统一请求取消策略（AbortController 生命周期）
- [ ] 修复会话切换时消息流竞态
- [ ] 修复临时会话 ID 与后端 threadId 替换时的边界问题

## 4. API 与数据流重构（Phase 3）

### 4.1 API Client 统一
- [x] 拆分 `api/index.ts`：按域模块化（graph/chat/auth/system）
- [ ] 统一错误模型（业务错误、网络错误、认证错误）
- [ ] 统一重试/超时/取消逻辑
- [ ] 统一 401 处理，避免多点重定向

### 4.2 SSE/流式协议抽象
- [ ] 独立 `sseClient` 与事件解析器
- [ ] 将 AG-UI 事件转换逻辑移到 adapter 层
- [ ] 统一 DONE/RUN_FINISHED/RUN_ERROR 收尾逻辑
- [ ] 增加流式断线恢复策略（至少明确不可恢复时的提示）

### 4.3 类型系统收敛
- [ ] 收敛 `unknown` 过宽字段（输入、输出、错误）
- [ ] 为 SSE 事件建立类型守卫全集
- [ ] 建立后端 DTO 与前端 ViewModel 转换层

## 5. 组件拆分与UI清洁（Phase 4）

### 5.1 大文件拆分
- [ ] 拆分 `MessageBubble.vue`（渲染、动画、样式分层）
- [ ] 拆分 `BottomPanel.vue`（表单、日志、SSE处理分离）
- [ ] 拆分 `Inspector.vue`（tabs 子组件化）
- [ ] 拆分 `GraphViewer.vue`（toolbar、canvas、layout算法分离）

### 5.2 组件边界规范
- [ ] 统一 props/emits 命名规范
- [ ] 禁止组件内直接访问全局副作用（localStorage/window）
- [ ] 将可复用 UI 提升到 `shared/ui`
- [ ] 清理废弃组件与未使用代码（如未挂载的旧聊天组件）

### 5.3 样式治理
- [ ] 建立样式层次：设计 token -> 组件样式 -> 页面覆盖
- [ ] 减少过深 `:deep()` 与重复样式块
- [ ] 建立暗黑/亮色回归清单

## 6. 安全与健壮性（Phase 5）

### 6.1 前端安全
- [ ] 审核 Markdown 渲染安全策略（白名单/净化方案）
- [ ] 增加 CSP 基线并验证资源加载
- [ ] 补充图片上传限制与异常提示（类型、大小、总量）

### 6.2 运行稳定性
- [ ] 调整心跳检测频率与退避策略
- [ ] 增加全局错误边界（页面级）
- [ ] 增加关键异步流程超时处理

## 7. 测试体系（Phase 6）

### 7.1 测试基础设施
- [ ] 引入单测框架（建议 Vitest + Vue Test Utils）
- [ ] 引入 E2E（建议 Playwright）
- [ ] 配置覆盖率阈值（先低后高）

### 7.2 核心单测用例
- [ ] useAuth：初始化、登录重定向、登出
- [ ] useChat/store：会话加载、消息发送、流式收尾、异常分支
- [ ] SSE 解析器：粘包、分片、DONE、错误事件
- [ ] schema 生成器：关键类型输入输出

### 7.3 E2E 烟测
- [ ] Graph 加载 -> 选节点 -> Debug 运行
- [ ] Chat 新建 -> 发送 -> 流式结束 -> 会话列表更新
- [ ] Auth 开启/关闭两种模式回归

## 8. 工程化与交付（Phase 7）

### 8.1 CI/CD 门禁
- [ ] CI 增加 type-check/lint/test/build 全链路
- [ ] PR 模板要求：变更说明、验证步骤、风险点
- [ ] 建立最小发布检查清单

### 8.2 文档与知识沉淀
- [ ] 更新 README（启动、环境变量、开发规范）
- [ ] 补架构文档（分层、状态、数据流）
- [ ] 补故障排查文档（常见错误与处理）

## 9. 分批交付计划（建议）

- [ ] 批次A（1~2周）：Phase 0 + Phase 1（不改业务行为）
- [ ] 批次B（1~2周）：Phase 2 + Phase 3（状态与数据流）
- [ ] 批次C（1~2周）：Phase 4 + Phase 5（组件拆分与安全）
- [ ] 批次D（1周）：Phase 6 + Phase 7（测试与CI收口）

## 10. 风险清单

- [ ] SSE 流程改造可能引入消息重复/丢失
- [ ] 状态迁移期间可能出现 UI 不同步
- [ ] 大文件拆分可能导致样式回归
- [ ] 引入测试框架会增加初期维护成本

## 11. 验收标准（全部满足才算完成）

- [ ] 核心路径回归全部通过
- [ ] `type-check/lint/test/build` 全绿
- [ ] 关键模块都有测试（auth/chat/sse）
- [ ] 无高危安全项（Markdown/CSP）
- [ ] 主要超长文件已拆分到可维护规模
- [ ] 文档与运行手册更新完成

## 12. 执行日志（持续追加）

- [x] 2026-02-19：创建总计划与跟踪清单。
- [x] 2026-02-19：完成 Phase 0 基线盘点文档，补充功能清单/风险清单/验收清单/体积与代码规模基线。
- [x] 2026-02-19：完成 Phase 0 剩余项（创建重构分支、生成 Lighthouse 首屏基线、生成 jscpd 重复逻辑基线）。
- [x] 2026-02-19：完成 Phase 1 第一批（shared 抽离、兼容导出层、feature 入口层、路由懒加载）。
- [x] 2026-02-19：完成 Phase 1 第二批（新增 404 兜底页、补充 feature/shared import 迁移并通过构建验证）。
- [x] 2026-02-19：完成 Phase 1 第三批（API 实现迁移到 shared/api、保留 api 兼容层、新增 no-restricted-imports 规则）。
- [x] 2026-02-19：完成 Phase 1 第四批（MainLayout/ChatLayout 下沉到 useMainShell/useChatShell，page-shell 只保留编排）。
- [x] 2026-02-19：完成 Phase 1 第五批（feature composable 实现迁入 feature，root composable 仅保留兼容导出；新增 shared/composables；增加 feature 依赖方向 lint 约束）。

## 13. 变更说明模板（每次改动都填）

- 日期：
- 批次/阶段：
- 本次完成：
- 风险与回滚点：
- 验证结果：
