# Phase 2 进度记录（2026-02-19，持续更新）

## 已完成

### 1) 引入 Pinia
- 已安装依赖：`pinia`
- 已在应用入口注入：`src/main.ts`

### 2) 建立 Store 骨架
- `src/features/auth/stores/authStore.ts`
- `src/features/graph/stores/graphStore.ts`
- `src/features/chat/stores/chatStore.ts`
- `src/shared/stores/uiStore.ts`

### 3) 第一批状态迁移（保留 composable 兼容 API）
- `useTheme` 与 `useNavButton` 改为由 `uiStore` 驱动：
  - `src/shared/composables/useTheme.ts`
  - `src/shared/composables/useNavButton.ts`
- `useLayout` 改为由 `uiStore` 驱动：
  - `src/features/graph/composables/useLayout.ts`
- `useGraph` 改为由 `graphStore` 驱动：
  - `src/features/graph/composables/useGraph.ts`
- `useAuth` 改为由 `authStore` 驱动：
  - `src/features/auth/composables/useAuth.ts`

## 验证结果

- `npm run type-check`：通过
- `npm run lint`：通过（保持 10 个 warning，不新增 error）
- `npm run build`：通过

## 当前已知影响

- 构建仍有大 chunk warning（体积优化属于后续阶段）
- `src/features/auth/composables/useAuth.ts` 与 `src/router/index.ts` 仍有调试日志 warning（待统一收敛）

## 下一步建议（Phase 2 第三批）

1. 把 `useServerStatus` 心跳状态迁入 store，统一管理生命周期与退避策略。
2. 把 `useChat` 的关键会话状态（activeConversation/messages/isStreaming）迁入 `chatStore`。
3. 给 store 增加最小单测（先覆盖 `uiStore` 与 `graphStore` 的核心 action）。
