# LLM 一对一聊天界面设计文档

## 1. 概述

本项目旨在设计一个参考 Telegram/QQ 风格的现代化 LLM 一对一聊天界面。该界面将作为独立模块集成，不干扰现有业务逻辑，并采用 Mock 数据驱动。设计重点在于“无极可变宽高”的自适应布局和“SOTA”级别的 UI/UX 体验。

## 2. 文件结构

建议创建以下文件结构：

```
src/
├── layout/
│   └── ChatLayout.vue       # 聊天独立布局容器
├── components/
│   └── chat/
│       ├── ChatSidebar.vue  # 左侧会话列表
│       ├── ChatArea.vue     # 右侧主聊天区域
│       ├── ChatInput.vue    # 底部输入框组件
│       └── MessageBubble.vue # 消息气泡组件
└── composables/
    └── useChatMock.ts       # Mock 数据与逻辑状态管理
```

## 3. 组件架构设计

### 3.1 ChatLayout.vue (布局容器)

**功能**: 负责整体结构的响应式布局。采用 Flexbox 或 Grid 布局，实现左侧侧边栏和右侧聊天窗口的自适应分割。

**Props**: 无

**关键样式**:
- `h-screen w-screen overflow-hidden bg-background text-foreground flex`
- **响应式策略**:
    - 桌面端: 左侧固定宽度 (e.g., `w-80` 或 `w-[320px]`) 或可拖拽调整，右侧 `flex-1`。
    - 移动端: 侧边栏占满全屏，点击会话后切换到聊天视图 (使用 `v-if` 或路由控制)。

### 3.2 ChatSidebar.vue (侧边栏)

**功能**: 展示历史会话列表，支持搜索、新建会话。

**Props**:
- `conversations`: `Conversation[]` (会话列表数据)
- `activeId`: `string` (当前选中的会话 ID)

**Events**:
- `select`: `(id: string) => void`

**UI 细节**:
- **头部**: 搜索框 (`bg-muted/50`), 新建按钮。
- **列表项**: 头像 (`rounded-full`), 昵称, 最后一条消息预览 (截断), 时间戳。
- **状态**: 选中态 (`bg-accent/50`), 悬停态 (`hover:bg-muted/50`).
- **滚动条**: 自定义细滚动条，隐藏式设计。

### 3.3 ChatArea.vue (主聊天区域)

**功能**: 展示当前会话的消息流，包含顶部导航栏、消息列表容器。

**Props**:
- `messages`: `Message[]` (当前会话的消息列表)
- `loading`: `boolean` (AI 是否正在回复)

**UI 细节**:
- **顶部栏**: 当前对话对象的名称、状态 (Online/Typing...)。具有玻璃拟态效果 (`backdrop-blur`).
- **消息列表**: `flex-1 overflow-y-auto p-4 space-y-4`. 自动滚动到底部。

### 3.4 MessageBubble.vue (消息气泡)

**功能**: 渲染单条消息。区分用户 (右侧) 和 AI (左侧)。

**Props**:
- `message`: `Message`
    - `content`: string
    - `role`: 'user' | 'assistant'
    - `timestamp`: number

**UI 细节**:
- **用户消息**:
    - 靠右对齐 (`flex-row-reverse`).
    - 背景色: `bg-primary text-primary-foreground`.
    - 圆角: `rounded-2xl rounded-tr-sm`.
- **AI 消息**:
    - 靠左对齐.
    - 背景色: `bg-muted/50` 或 `bg-card border border-border`.
    - 圆角: `rounded-2xl rounded-tl-sm`.
    - **Markdown 支持**: 内容区域支持 Markdown 渲染 (代码高亮、列表等)。
- **动画**: 消息出现时的轻微上浮淡入动画 (`transition-all duration-300`).

### 3.5 ChatInput.vue (输入区域)

**功能**: 文本输入，发送消息。

**Events**:
- `send`: `(text: string) => void`

**UI 细节**:
- 悬浮式设计或底部固定。
- 输入框: `textarea` 自动增高 (Auto-resize), `max-h-40`.
- 样式: `bg-muted/30 backdrop-blur-md rounded-xl border border-border/50`.
- 发送按钮: 仅在有内容时高亮。

## 4. Mock 数据结构 (useChatMock.ts)

```typescript
// 类型定义
export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  status?: 'sending' | 'sent' | 'error';
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  unreadCount: number;
  lastMessage?: Message;
}

// Composable
export function useChatMock() {
  // State
  const conversations = ref<Conversation[]>([]);
  const messages = ref<Record<string, Message[]>>({});
  const activeConversationId = ref<string | null>(null);
  const currentUser = { id: 'u1', name: 'Me', avatar: '...' };

  // Actions
  const sendMessage = async (text: string) => { ... }; // 模拟网络延迟和 AI 回复流
  
  return { ... };
}
```

## 5. 样式与 SOTA 建议 (Tailwind CSS)

为了达到 SOTA (State of the Art) 效果，建议利用现有的 CSS 变量系统，并添加以下细节：

1.  **玻璃拟态 (Glassmorphism)**:
    - 在 Sidebar 背景、ChatHeader 和 ChatInput 使用 `bg-background/80 backdrop-blur-xl border-r border-border/40`。
    - 这种通透感是现代 UI 的标志。

2.  **阴影与层次**:
    - 使用 `shadow-sm` 或 `shadow-md` 给气泡增加微弱的立体感，特别是 AI 的气泡（如果是卡片风格）。
    - 输入框聚焦时使用 `ring-2 ring-primary/20` 代替默认 outline。

3.  **排版与间距**:
    - 宽松的行高 (`leading-relaxed`)。
    - 适当的内边距 (`p-4` 或 `p-6`)，避免拥挤。
    - 字体颜色分级: 主要内容 `text-foreground`, 次要信息 (时间) `text-muted-foreground`.

4.  **动画 (Transitions)**:
    - 所有的 Hover 效果添加 `transition-colors duration-200`.
    - 侧边栏切换、消息发送使用 `TransitionGroup` 实现平滑过渡。

5.  **暗黑模式适配**:
    - 确保所有颜色使用 `hsl(var(--...))` 变量，这样能自动适配 `src/assets/main.css` 中定义的 Dark Mode。

## 6. 下一步计划

1.  创建 `src/composables/useChatMock.ts` 实现基础数据逻辑。
2.  创建 `src/layout/ChatLayout.vue` 搭建骨架。
3.  依次实现 Sidebar, ChatArea, MessageBubble, ChatInput 组件。
4.  在 `App.vue` 或路由中挂载 `ChatLayout` 进行预览调试。