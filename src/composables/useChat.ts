import { ref, computed } from 'vue'
import { streamChatMessage, fetchSessions, fetchSessionMessages } from '@/api'
import type { AgUiEvent, RunAgentInput, Session, SessionMessage } from '@/types'

// 类型定义
export interface User {
  id: string
  name: string
  avatar: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  status?: 'sending' | 'sent' | 'error' | 'streaming' // 新增 streaming 状态
  model?: string
  reasoning_content?: string
  reasoningStatus?: 'thinking' | 'done' // 思考状态：thinking=思考中，done=思考完成
  images?: string[] // 图片数据数组（base64 格式）
  tool_calls?: ToolCallState[]
}

export interface ToolCallState {
  id: string
  name: string
  args?: unknown
  status: 'running' | 'done' | 'error'
  error?: string
}

export interface ImageAttachment {
  mimeType: string
  data: string
  name?: string
}

export interface Conversation {
  id: string // tree_id 或 local_xxx，用于前端列表 key
  sessionId?: string // last_active_session_id，用于 API 调用
  title: string
  updatedAt: number
  unreadCount: number
  lastMessage?: Message
}

// Mock 对话内容 - 用于展示各种 Markdown 渲染能力
const MARKDOWN_DEMO_CONTENT = `# Markdown 渲染演示

这是一个**完整的 Markdown 渲染演示**，包含了各种常见语法和扩展功能。

---

## 1. 基础文本格式

这是普通文本。**这是粗体**，*这是斜体*，***这是粗斜体***。

~~这是删除线文本~~，这是\`行内代码\`。

> 这是一段引用文字。
> 引用可以有多行。

---

## 2. 列表

### 无序列表
- 苹果
- 香蕉
  - 小香蕉
  - 大香蕉
- 橙子

### 有序列表
1. 第一步：准备材料
2. 第二步：开始制作
3. 第三步：完成

---

## 3. 代码块

\`\`\`javascript
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}
\`\`\`

---

## 4. 表格

| 功能 | 状态 | 优先级 |
|:-----|:----:|-------:|
| 代码高亮 | ✅ 完成 | 高 |
| Mermaid 图表 | ✅ 完成 | 高 |

---

## 5. Mermaid 图表

\`\`\`mermaid
flowchart TD
    A[开始] --> B{用户登录?}
    B -->|是| C[显示主页]
    B -->|否| D[显示登录页]
    C --> E[结束]
\`\`\`

**演示完毕！**`

// 思考过程演示内容
const REASONING_DEMO_CONTENT = `根据我的分析，快速排序的平均时间复杂度是 **O(n log n)**。

## 详细解释

| 情况 | 时间复杂度 | 说明 |
|------|-----------|------|
| 最佳情况 | O(n log n) | 每次都能均匀分割 |
| 平均情况 | O(n log n) | 随机数据 |
| 最坏情况 | O(n²) | 已排序数组 |

### 代码示例

\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
\`\`\``

const REASONING_DEMO_THINKING = `用户问的是快速排序的时间复杂度，让我仔细分析一下...

**最佳情况分析：**
- 每次分割都能将数组均匀分成两半
- 分割深度为 log₂n
- 总复杂度：n × log n = O(n log n)

**最坏情况分析：**
- 当数组已经排序时
- 每次分割只能分出一个元素
- 总复杂度：n × n = O(n²)`

// 本地演示数据
const LOCAL_DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'reasoning-demo',
    title: '思考过程演示',
    updatedAt: Date.now() - 500,
    unreadCount: 0,
  },
  {
    id: 'markdown-demo',
    title: 'Markdown 渲染演示',
    updatedAt: Date.now() - 1000,
    unreadCount: 0,
  },
]

const LOCAL_DEMO_MESSAGES: Record<string, Message[]> = {
  'reasoning-demo': [
    {
      id: 'reasoning-user-1',
      conversationId: 'reasoning-demo',
      role: 'user',
      content: '快速排序的时间复杂度是多少？',
      timestamp: Date.now() - 30000,
      status: 'sent',
    },
    {
      id: 'reasoning-assistant-1',
      conversationId: 'reasoning-demo',
      role: 'assistant',
      content: REASONING_DEMO_CONTENT,
      reasoning_content: REASONING_DEMO_THINKING,
      reasoningStatus: 'done',
      timestamp: Date.now() - 29000,
      status: 'sent',
      model: 'DeepSeek-R1',
    },
  ],
  'markdown-demo': [
    {
      id: 'demo-user-1',
      conversationId: 'markdown-demo',
      role: 'user',
      content: '请展示一下 Markdown 渲染的功能',
      timestamp: Date.now() - 60000,
      status: 'sent',
    },
    {
      id: 'demo-assistant-1',
      conversationId: 'markdown-demo',
      role: 'assistant',
      content: MARKDOWN_DEMO_CONTENT,
      timestamp: Date.now() - 59000,
      status: 'sent',
      model: 'Claude-3.5-Sonnet',
    },
  ],
}

const createLocalDemoConversations = (): Conversation[] =>
  LOCAL_DEMO_CONVERSATIONS.map((conversation) => ({ ...conversation }))

const createLocalDemoMessages = (): Record<string, Message[]> =>
  Object.fromEntries(
    Object.entries(LOCAL_DEMO_MESSAGES).map(([conversationId, messageList]) => [
      conversationId,
      messageList.map((message) => ({
        ...message,
        images: message.images ? [...message.images] : undefined,
        tool_calls: message.tool_calls?.map((toolCall) => ({ ...toolCall })),
      })),
    ])
  )

// 全局状态
const conversations = ref<Conversation[]>(createLocalDemoConversations())
const messages = ref<Record<string, Message[]>>(createLocalDemoMessages())
const activeConversationId = ref<string | null>(null)
const isLoadingSessions = ref(false)
const isLoadingMessages = ref(false)
const currentUser: User = {
  id: 'u1',
  name: 'Me',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
}

// SSE 流式传输控制
const currentAbortController = ref<AbortController | null>(null)

// 通过检查消息状态来判断是否正在流式传输
const isStreaming = computed(() => {
  if (!activeConversationId.value) return false
  const msgList = messages.value[activeConversationId.value]
  return msgList?.some((m) => m.status === 'streaming') ?? false
})

export function useChat() {
  // 将 Session 数据转换为 Conversation 格式
  const sessionToConversation = (session: Session): Conversation => ({
    id: session.id, // 会话树 ID
    sessionId: session.last_active_session_id, // 用于 API 调用
    title: session.title,
    updatedAt: new Date(session.updated_at).getTime(),
    unreadCount: 0,
    lastMessage: session.last_message
      ? {
          id: `last-${session.id}`,
          conversationId: session.id,
          role: 'assistant',
          content: session.last_message,
          timestamp: new Date(session.updated_at).getTime(),
          status: 'sent',
        }
      : undefined,
  })

  // 将 SessionMessage 数据转换为 Message 格式
  const sessionMessageToMessage = (
    msg: SessionMessage,
    conversationId: string,
    index: number
  ): Message => ({
    id: `${conversationId}-${index}`,
    conversationId,
    role: (msg.role === 'tool' ? 'assistant' : msg.role) as Message['role'],
    content: msg.content,
    reasoning_content: msg.reasoning_content,
    reasoningStatus: msg.reasoning_content ? 'done' : undefined,
    timestamp: Date.now() - (1000 - index), // 保持消息顺序
    status: 'sent',
    model: msg.model, // 传递模型信息（仅助手消息有值）
  })

  // 从后端加载会话列表
  const loadSessions = async () => {
    isLoadingSessions.value = true
    try {
      const response = await fetchSessions()
      const remoteSessions = response.sessions.map(sessionToConversation)
      const remoteIds = new Set(remoteSessions.map((s) => s.id))

      // 保留当前列表里“后端还没返回”的会话（比如本地新建、或刚创建还没同步到列表）
      const existingExtra = conversations.value.filter((c) => {
        if (LOCAL_DEMO_CONVERSATIONS.some((d) => d.id === c.id)) return false
        return !remoteIds.has(c.id)
      })

      // 如果已有同 id 的会话，优先保留现有对象（避免丢本地状态/消息），再用后端字段做一次刷新
      const existingById = new Map(conversations.value.map((c) => [c.id, c] as const))
      const mergedRemote = remoteSessions.map((remote) => {
        const existing = existingById.get(remote.id)
        if (!existing) return remote
        existing.title = remote.title
        existing.updatedAt = remote.updatedAt
        existing.sessionId = remote.sessionId
        existing.lastMessage = remote.lastMessage ?? existing.lastMessage
        return existing
      })

      const merged = [...mergedRemote, ...existingExtra]
      merged.sort((a, b) => b.updatedAt - a.updatedAt)
      conversations.value = [...merged, ...createLocalDemoConversations()]
    } catch (error) {
      console.error('Failed to load sessions:', error)
      // 失败时保留当前会话 + 本地演示数据（避免把用户刚创建的会话刷掉）
      const existing = conversations.value.filter(
        (c) => !LOCAL_DEMO_CONVERSATIONS.some((d) => d.id === c.id)
      )
      conversations.value = [...existing, ...createLocalDemoConversations()]
    } finally {
      isLoadingSessions.value = false
    }
  }

  // 从后端加载指定会话的消息
  const loadSessionMessages = async (conversationId: string) => {
    // 找到对应的 conversation 获取 sessionId
    const conv = conversations.value.find((c) => c.id === conversationId)
    const sessionId = conv?.sessionId || conversationId

    // 跳过本地会话、演示会话、或无 sessionId 的会话
    if (!sessionId || LOCAL_DEMO_MESSAGES[conversationId]) return

    // 如果已经加载过，不再重复加载
    const existingMessages = messages.value[conversationId]
    if (existingMessages && existingMessages.length > 0) return

    isLoadingMessages.value = true
    try {
      const response = await fetchSessionMessages(sessionId)
      messages.value[conversationId] = response.messages.map((msg, index) =>
        sessionMessageToMessage(msg, conversationId, index)
      )
    } catch (error) {
      console.error(`Failed to load messages for session ${sessionId}:`, error)
      // 404 等错误时初始化为空数组
      messages.value[conversationId] = []
    } finally {
      isLoadingMessages.value = false
    }
  }

  // 选择会话
  const selectConversation = async (id: string) => {
    activeConversationId.value = id
    // 如果是已存在的会话且消息未加载，则加载消息
    if (!id.startsWith('local_') && !messages.value[id]) {
      await loadSessionMessages(id)
    }
  }

  const sendMessage = async (
    text: string,
    model?: string,
    thinking?: boolean,
    attachments?: ImageAttachment[]
  ) => {
    if (!activeConversationId.value) return

    const conversationId = activeConversationId.value
    const normalizedText = text.trim()
    const safeAttachments = attachments ?? []
    const displayContent =
      normalizedText || (safeAttachments.length > 0 ? `[已上传 ${safeAttachments.length} 张图片]` : '')

    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId,
      role: 'user',
      content: displayContent,
      timestamp: Date.now(),
      status: 'sending',
      model,
    }

    // 添加用户消息
    if (!messages.value[conversationId]) {
      messages.value[conversationId] = []
    }
    messages.value[conversationId].push(newMessage)

    // 更新会话最后一条消息
    const convIndex = conversations.value.findIndex((c) => c.id === conversationId)
    if (convIndex !== -1) {
      const conv = conversations.value[convIndex]
      if (conv) {
        conv.lastMessage = newMessage
        conv.updatedAt = Date.now()
        // 移到顶部
        conversations.value.splice(convIndex, 1)
        conversations.value.unshift(conv)
      }
    }

    // 标记用户消息为已发送
    newMessage.status = 'sent'

    // 创建 AI 回复消息占位符（streaming 状态）
    const aiMessageId = (Date.now() + 1).toString()
    const aiMessage: Message = {
      id: aiMessageId,
      conversationId,
      role: 'assistant',
      content: '', // 初始为空，流式填充
      reasoning_content: '', // 思考内容初始为空
      images: [], // 图片数组初始为空
      timestamp: Date.now(),
      status: 'streaming', // 流式接收中
      model: model,
    }

    if (messages.value[conversationId]) {
      messages.value[conversationId].push(aiMessage)
    }

    // 创建 AbortController 用于中断请求
    const abortController = new AbortController()
    currentAbortController.value = abortController

    // 本地会话和内置演示会话都没有后端 threadId，需要等待 RUN_STARTED 回传
    const isLocal = conversationId.startsWith('local_')
    const isDemoConversation = !!LOCAL_DEMO_MESSAGES[conversationId]
    const isEphemeralConversation = isLocal || isDemoConversation
    let assistantMessageId = aiMessageId
    let runClosed = false

    const getCurrentConversationId = (): string => {
      if (!isEphemeralConversation) return conversationId
      return activeConversationId.value || conversationId
    }

    const findAssistantMessage = (): Message | undefined => {
      const currentConvId = getCurrentConversationId()
      const msgList = messages.value[currentConvId]
      if (!msgList) return undefined
      return msgList.find((m) => m.id === assistantMessageId || m.id === aiMessageId)
    }

    const finalizeConversation = () => {
      const currentConvId = getCurrentConversationId()
      const convIdx = conversations.value.findIndex((c) => c.id === currentConvId)
      if (convIdx === -1) return
      const conv = conversations.value[convIdx]
      if (!conv) return

      const msg = findAssistantMessage()
      if (msg) {
        conv.lastMessage = msg
        conv.updatedAt = Date.now()
      }

      if (conv.title === 'New Chat') {
        conv.title =
          displayContent.length > 30 ? displayContent.substring(0, 30) + '...' : displayContent
      }
    }

    const ensureToolCallState = (msg: Message, toolCallId: string, name?: string): ToolCallState => {
      if (!msg.tool_calls) {
        msg.tool_calls = []
      }
      let toolCall = msg.tool_calls.find((tc) => tc.id === toolCallId)
      if (!toolCall) {
        toolCall = {
          id: toolCallId,
          name: name || 'tool_call',
          status: 'running',
        }
        msg.tool_calls.push(toolCall)
      } else if (name) {
        toolCall.name = name
      }
      return toolCall
    }

    const handleAgUiEvent = (event: AgUiEvent) => {
      const msg = findAssistantMessage()

      switch (event.type) {
        case 'RUN_STARTED':
          if (isEphemeralConversation && event.threadId) {
            updateConversationInfo(conversationId, event.threadId)
          }
          break
        case 'TEXT_MESSAGE_START':
          if (msg && event.messageId && msg.id !== event.messageId) {
            msg.id = event.messageId
            assistantMessageId = event.messageId
          }
          break
        case 'TEXT_MESSAGE_REASONING_START':
          if (msg) {
            msg.reasoningStatus = 'thinking'
          }
          break
        case 'TEXT_MESSAGE_REASONING_DELTA':
          if (msg) {
            msg.reasoning_content = (msg.reasoning_content || '') + event.delta
            msg.reasoningStatus = 'thinking'
          }
          break
        case 'TEXT_MESSAGE_REASONING_END':
          if (msg && msg.reasoningStatus === 'thinking') {
            msg.reasoningStatus = 'done'
          }
          break
        case 'TEXT_MESSAGE_DELTA':
          if (msg) {
            msg.content += event.delta
            if (msg.reasoningStatus === 'thinking') {
              msg.reasoningStatus = 'done'
            }
          }
          break
        case 'TOOL_CALL_START':
          if (msg) {
            const toolCall = ensureToolCallState(msg, event.toolCallId, event.toolCallName)
            toolCall.status = 'running'
          }
          break
        case 'TOOL_CALL_ARGS':
          if (msg) {
            const toolCall = ensureToolCallState(msg, event.toolCallId)
            toolCall.args = event.args
          }
          break
        case 'TOOL_CALL_END':
          if (msg) {
            const toolCall = ensureToolCallState(msg, event.toolCallId, event.toolCallName)
            toolCall.status = 'done'
          }
          break
        case 'RUN_FINISHED':
          if (msg) {
            msg.status = 'sent'
            if (msg.reasoningStatus === 'thinking') {
              msg.reasoningStatus = 'done'
            }
          }
          runClosed = true
          finalizeConversation()
          currentAbortController.value = null
          break
        case 'RUN_ERROR':
          if (msg) {
            msg.status = 'error'
            msg.content = msg.content || `抱歉，发送消息时出现错误: ${event.message}`
          }
          runClosed = true
          currentAbortController.value = null
          break
      }
    }

    const runInputContent = [
      ...(normalizedText ? [{ type: 'text' as const, text: normalizedText }] : []),
      ...safeAttachments.map((attachment) => ({
        type: 'binary' as const,
        mimeType: attachment.mimeType,
        data: attachment.data,
      })),
    ]

    const runInput: RunAgentInput = {
      threadId: isEphemeralConversation ? undefined : conversationId,
      runId:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? `run_${crypto.randomUUID()}`
          : `run_${Date.now()}`,
      messages: [
        {
          id: newMessage.id,
          role: 'user',
          content: runInputContent,
        },
      ],
      forwardedProps: {
        ...(model ? { model } : {}),
        ...(thinking !== undefined ? { thinking } : {}),
      },
    }

    try {
      // 使用流式 API
      await streamChatMessage(
        runInput,
        {
          onEvent: (event) => {
            handleAgUiEvent(event)
          },
          onDone: () => {
            if (runClosed) return
            const msg = findAssistantMessage()
            if (msg) {
              if (msg.status === 'streaming') {
                msg.status = 'sent'
              }
              if (msg.reasoningStatus === 'thinking') {
                msg.reasoningStatus = 'done'
              }
            }
            runClosed = true
            finalizeConversation()
            currentAbortController.value = null
          },
          onError: (error: string) => {
            const msg = findAssistantMessage()
            if (msg) {
              msg.status = 'error'
              msg.content = msg.content || `抱歉，发送消息时出现错误: ${error}`
            }
            runClosed = true
            currentAbortController.value = null
          },
        },
        abortController.signal
      )
    } catch (error) {
      console.error('Error sending message:', error)

      // 更新 AI 消息状态为错误
      // 注意：此时 conversationId 可能已被更新，需要使用新的 ID
      const currentConvId = isEphemeralConversation ? activeConversationId.value : conversationId
      const msgList = currentConvId ? messages.value[currentConvId] : null
      if (msgList) {
        const msg = msgList.find((m) => m.id === assistantMessageId || m.id === aiMessageId)
        if (msg) {
          // 如果是主动中断，不显示错误
          if (error instanceof Error && error.name === 'AbortError') {
            msg.status = 'sent'
            if (!msg.content) {
              msg.content = '已停止生成'
            }
          } else {
            msg.status = 'error'
            if (!msg.content) {
              msg.content = '抱歉，发送消息时出现错误。请稍后再试。'
            }
          }
        }
      }

      // 清理 AbortController
      currentAbortController.value = null
    }
  }

  const stopStreaming = () => {
    if (currentAbortController.value) {
      currentAbortController.value.abort()
      currentAbortController.value = null
    }
  }

  const createConversation = () => {
    // 本地临时 ID，仅用于前端 UI 状态管理，不发送给后端
    const localId = `local_${Date.now()}`
    const newConv: Conversation = {
      id: localId,
      title: 'New Chat',
      updatedAt: Date.now(),
      unreadCount: 0,
    }
    conversations.value.unshift(newConv)
    messages.value[localId] = []
    activeConversationId.value = localId
  }

  // 更新会话信息（用于收到后端 session 后替换本地临时数据）
  const updateConversationInfo = (oldId: string, newTreeId: string, newSessionId?: string) => {
    // 1. 更新 conversations 列表
    const oldIdx = conversations.value.findIndex((c) => c.id === oldId)
    const existingNewIdx = conversations.value.findIndex((c) => c.id === newTreeId)
    const conv = oldIdx >= 0 ? conversations.value[oldIdx] : undefined

    if (conv) {
      conv.id = newTreeId
      if (newSessionId) {
        conv.sessionId = newSessionId
      }
    }

    // 如果列表里已经有同一个 newTreeId，去重，保留当前会话对象
    if (existingNewIdx >= 0 && existingNewIdx !== oldIdx) {
      conversations.value.splice(existingNewIdx, 1)
    }

    // 2. 更新 messages 映射的 key
    if (messages.value[oldId]) {
      const oldMsgs = messages.value[oldId]
      const existingMsgs = messages.value[newTreeId]

      const mergedMsgs = existingMsgs ? [...existingMsgs, ...oldMsgs] : oldMsgs
      const seen = new Set<string>()
      messages.value[newTreeId] = mergedMsgs.filter((m) => {
        if (seen.has(m.id)) return false
        seen.add(m.id)
        return true
      })
      messages.value[newTreeId].forEach((m) => (m.conversationId = newTreeId))
      delete messages.value[oldId]
    }

    // 3. 更新当前活跃会话 ID
    if (activeConversationId.value === oldId) {
      activeConversationId.value = newTreeId
    }
  }

  return {
    conversations,
    messages,
    activeConversationId,
    currentUser,
    isLoadingSessions,
    isLoadingMessages,
    sendMessage,
    createConversation,
    selectConversation,
    loadSessions,
    loadSessionMessages,
    isStreaming,
    stopStreaming,
  }
}
