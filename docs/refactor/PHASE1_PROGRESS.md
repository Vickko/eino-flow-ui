# Phase 1 进度记录（2026-02-19）

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

### 2) feature 入口层（第一批）
- 新增：
  - `src/features/auth/**`
  - `src/features/chat/**`
  - `src/features/graph/**`
- 当前策略：先建立“入口层 + re-export”，后续再逐步把实现下沉到 feature 内部。

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

### 6) import 规则固化
- 在 `eslint.config.js` 新增 `no-restricted-imports`，禁止新增对以下兼容层路径的依赖：
  - `@/api*`
  - `@/types`
  - `@/lib/utils`
  - `@/utils/schema`
  - `@/utils/modelIcons`

## 验证结果

- `npm run type-check`：通过
- `npm run lint`：通过（保持 10 个 warning，不新增 error）
- `npm run build`：通过

## 当前已知影响

- 构建仍有大 chunk warning（体积优化属于后续阶段）
- feature 目录目前是“入口层”而非“完全迁移”，后续要继续把实现文件迁入 feature 域目录

## 下一步建议（Phase 1 第四批）

1. 把 `shared/api` 按域再拆细（graph/chat/system），减少单文件体积。
2. 把 `MainLayout` / `ChatLayout` 的业务状态继续下沉，page-shell 仅保留编排逻辑。
3. 补依赖方向约束（feature -> shared）并清理剩余跨层引用。
