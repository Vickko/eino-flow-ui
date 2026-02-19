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

## 验证结果

- `npm run type-check`：通过
- `npm run lint`：通过（保持 10 个 warning，不新增 error）
- `npm run build`：通过

## 当前已知影响

- 构建仍有大 chunk warning（体积优化属于后续阶段）
- feature 目录目前是“入口层”而非“完全迁移”，后续要继续把实现文件迁入 feature 域目录

## 下一步建议（Phase 1 第二批）

1. 把 `graph/chat/auth` 的 API 实现从 `src/api` 拆到 feature 域目录（先复制再切流量，最后删除旧入口）。
2. 把 `MainLayout` / `ChatLayout` 中的业务状态逻辑继续下沉，保留 page-shell 只做编排。
3. 增加 import 约束规则（如禁止跨域相对路径引用），用 ESLint 固化。
