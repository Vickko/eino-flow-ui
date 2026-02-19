# Phase 1 进度记录（2026-02-19，持续更新）

## 已完成

### 1) shared 通用层抽离
- 已迁移：
  - `src/types/index.ts` -> `src/shared/types/index.ts`
  - `src/lib/utils.ts` -> `src/shared/lib/utils.ts`
  - `src/utils/schema.ts` -> `src/shared/utils/schema.ts`
  - `src/utils/modelIcons.ts` -> `src/shared/utils/modelIcons.ts`
- 已保留兼容导出层（旧路径仍可用）：
  - `src/types/index.ts`
  - `src/lib/utils.ts`
  - `src/utils/schema.ts`
  - `src/utils/modelIcons.ts`

### 2) feature 分层落地（第一批）
- 新增：
  - `src/features/auth/**`
  - `src/features/chat/**`
  - `src/features/graph/**`
- 已完成 composable 主体实现下沉：
  - `useAuth` -> `src/features/auth/composables/useAuth.ts`
  - `useGraph/useLayout/useServerStatus` -> `src/features/graph/composables/*`
  - `useChat/useModelManagement` -> `src/features/chat/composables/*`
- root 兼容层仍保留（`src/composables/*`），但只做 re-export。

### 3) 路由懒加载
- `src/router/index.ts` 已将页面组件改为懒加载：
  - `MainLayout`
  - `ChatLayout`
- 已补充路由兜底页：`src/layout/NotFoundLayout.vue`

### 4) import 迁移（第一批）
- 大部分类型与工具 import 已切到 `@/shared/*`
- 部分页面/组件 import 已切到 `@/features/*`

### 5) API 实现迁移到 shared/api（第三批）
- 已迁移：
  - `src/api/index.ts` -> `src/shared/api/index.ts`
  - `src/api/auth.ts` -> `src/shared/api/auth.ts`
- 已保留兼容导出层（旧路径仍可用）：
  - `src/api/index.ts`
  - `src/api/auth.ts`
- feature API 入口已切到 shared 实现：
  - `src/features/graph/api/graphApi.ts`
  - `src/features/chat/api/chatApi.ts`
  - `src/features/auth/api/authApi.ts`

### 6) shared/api 再拆分（第四批）
- 已按域拆分：
  - `src/shared/api/base.ts`
  - `src/shared/api/systemApi.ts`
  - `src/shared/api/graphApi.ts`
  - `src/shared/api/chatApi.ts`
- `src/shared/api/index.ts` 作为统一导出入口保留。
- 401 处理留在 `base.ts`，通过 `setUnauthorizedHandler` 注入，避免 `api <-> auth` 反向引用。

### 7) page-shell 下沉（第四批）
- `MainLayout` 业务状态下沉到 `src/features/graph/composables/useMainShell.ts`
- `ChatLayout` 业务状态下沉到 `src/features/chat/composables/useChatShell.ts`
- 布局层保留页面编排，减少“壳层堆业务”的问题。

### 8) shared composable 抽离（第五批）
- 新增：
  - `src/shared/composables/useTheme.ts`
  - `src/shared/composables/useNavButton.ts`
- 旧路径 `src/composables/useTheme.ts`、`src/composables/useNavButton.ts` 保留兼容导出。

### 9) import 规则固化
- 在 `eslint.config.js` 新增 `no-restricted-imports`，禁止新增对以下兼容层路径的依赖：
  - `@/api*`
  - `@/types`
  - `@/lib/utils`
  - `@/utils/schema`
  - `@/utils/modelIcons`
- 在 `src/features/**` 追加依赖方向约束，禁止 feature 层反向依赖：
  - `@/composables/*`
  - `@/components/*`
  - `@/layout/*`
  - `@/router*`
  - `@/App.vue`、`@/main`

## 验证结果

- `npm run type-check`：通过
- `npm run lint`：通过（保持 10 个 warning，不新增 error）
- `npm run build`：通过

## 当前已知影响

- 构建仍有大 chunk warning（体积优化属于后续阶段）
- 仍存在调试日志 warning（`router` 与 `useAuth`），后续在安全与稳定性阶段统一收敛

## 下一步建议（进入 Phase 2）

1. 引入 `Pinia`，先落地 `authStore` / `graphStore` / `chatStore` / `uiStore` 空骨架。
2. 把当前模块级单例 `ref` 状态逐步迁到 store，保留兼容适配期。
3. 先收敛会话流与中止控制（`AbortController` 生命周期），再做 SSE 统一抽象。
