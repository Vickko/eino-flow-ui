# 前端工程审计报告

> 审计日期: 2025-12-16
> 技术栈: Vue 3.5 + TypeScript 5.9 + Vite 7.1 + Tailwind CSS 4.1

---

## 问题汇总

| 级别 | 数量 | 状态 |
|------|------|------|
| 严重 (Critical) | 2 | ✅ 1/2 已修复 |
| 重要 (High) | 4 | ⏳ 待处理 |
| 中等 (Medium) | 5 | ⏳ 待处理 |
| 轻微 (Low) | 7 | ⏳ 待处理 |
| 安全 (Security) | 2 | ⏳ 待处理 |

---

## 一、严重问题 (Critical)

### 1. ✅ 缺失代码质量工具配置
**位置**: 项目根目录

~~缺失文件:~~
- ~~ESLint 配置~~
- ~~Prettier 配置~~
- ~~.editorconfig~~

**已添加文件**:
- `eslint.config.js` - ESLint 9 flat config
- `.prettierrc` + `.prettierignore`
- `.editorconfig`

**新增脚本**:
- `npm run lint` / `npm run lint:fix`
- `npm run format` / `npm run format:check`

**状态**: ✅ 已修复

---

### 2. ❌ 硬编码的 API 基础 URL
**位置**: `src/api/index.ts:13-14`

```typescript
let API_BASE = 'http://localhost:52538/eino/devops'
const CHAT_API_BASE = 'http://localhost:52538'
```

**建议**: 使用 `import.meta.env.VITE_API_BASE` 环境变量

**状态**: ⏳ 待处理

---

## 二、重要问题 (High)

### 3. ⚠️ Composables 全局状态泄漏模式
**位置**:
- `src/composables/useChat.ts:509-520`
- `src/composables/useGraph.ts:4-7`
- `src/composables/useServerStatus.ts:4-6`

**问题**: 状态定义在模块级别而非函数内部

**建议**: 使用 Pinia 或工厂模式

**状态**: ⏳ 待处理

---

### 4. ⚠️ 心跳检测过于频繁
**位置**: `src/composables/useServerStatus.ts:26`

```typescript
timer = setInterval(checkHeartbeat, 500)  // 每 500ms
```

**建议**: 改为 5000-10000ms

**状态**: ⏳ 待处理

---

### 5. ⚠️ 未清理的定时器
**位置**: `src/composables/useServerStatus.ts`

**问题**: 缺少 `stopHeartbeat` 函数

**状态**: ⏳ 待处理

---

### 6. ⚠️ useTheme 媒体查询监听器问题
**位置**: `src/composables/useTheme.ts:40-42`

**问题**: `mediaQuery` 在函数内创建，`removeEventListener` 无效

**状态**: ⏳ 待处理

---

## 三、中等问题 (Medium)

### 7. 📝 残留 console 语句 (19 处)
**位置**:
- `src/api/index.ts` - 7 处
- `src/composables/*.ts` - 6 处
- `src/components/*.vue` - 6 处

**状态**: ⏳ 待处理

---

### 8. 📝 MessageBubble 模块级状态
**位置**: `src/components/chat/MessageBubble.vue:3`

```typescript
const renderedMessageIds = new Set<string>();  // 永远不会清理
```

**状态**: ⏳ 待处理

---

### 9. 📝 useChat 包含大量 Mock 数据
**位置**: `src/composables/useChat.ts:31-507`

**问题**: ~470 行 mock 数据混入业务代码

**状态**: ⏳ 待处理

---

### 10. 📝 API 层错误处理不统一
**位置**: `src/api/index.ts`

**问题**: 部分函数有 try-catch，部分没有

**状态**: ⏳ 待处理

---

### 11. 📝 类型定义过于宽泛
**位置**: `src/types/index.ts`

```typescript
input: unknown   // 应更具体
output: unknown
error?: unknown  // 应为 Error
```

**状态**: ⏳ 待处理

---

## 四、轻微问题 (Low)

### 12. 路由缺少元信息和守卫
**位置**: `src/router/index.ts`

**状态**: ⏳ 待处理

---

### 13. 组件导入路径不一致
**问题**: 混用相对路径和 `@/` 别名

**状态**: ⏳ 待处理

---

### 14. Vite 配置缺少生产优化
**位置**: `vite.config.ts`

**状态**: ⏳ 待处理

---

### 15. TypeScript 配置可加强
**位置**: `tsconfig.json`

**状态**: ⏳ 待处理

---

### 16. package.json 缺失关键字段
**缺失**: description, author, license, lint/test 脚本

**状态**: ⏳ 待处理

---

### 17. GraphViewer 组件过于庞大
**位置**: `src/components/GraphViewer.vue` (468 行)

**状态**: ⏳ 待处理

---

### 18. CSS 样式覆盖过多
**位置**: `src/components/chat/MessageBubble.vue`

**问题**: 大量 `:deep()` 选择器

**状态**: ⏳ 待处理

---

## 五、安全问题 (Security)

### 19. XSS 风险 - Markdown 渲染
**位置**: `src/components/chat/MessageBubble.vue`

**状态**: ⏳ 待处理

---

### 20. 无 CSP 配置
**位置**: `index.html`

**状态**: ⏳ 待处理

---

## 修复进度

- [x] 记录审计结果
- [x] ESLint + Prettier 配置
- [ ] 环境变量管理
- [ ] 状态管理重构
- [ ] 清理 console 语句
- [ ] 分离 Mock 数据
