import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChat } from '@/features/chat/composables/useChat'
import { useChatStore } from '@/features/chat/stores/chatStore'
import { ApiClientError } from '@/shared/api/errors'
import type { AgUiEvent } from '@/shared/types'
import type { StreamChatCallbacks } from '@/shared/api/chatApi'

interface PendingStream {
  callbacks: StreamChatCallbacks
  signal?: AbortSignal
  resolve: () => void
}

const pendingStreams: PendingStream[] = []

const createAbortError = (): ApiClientError =>
  new ApiClientError({
    kind: 'abort',
    message: 'Request aborted',
    retryable: false,
  })

vi.mock('@/features/chat/api/chatApi', () => {
  return {
    streamChatMessage: vi.fn(
      (_request: unknown, callbacks: StreamChatCallbacks, signal?: AbortSignal) =>
        new Promise<void>((resolve, reject) => {
          let settled = false
          const safeResolve = () => {
            if (settled) return
            settled = true
            resolve()
          }
          const safeReject = (error: Error) => {
            if (settled) return
            settled = true
            callbacks.onError?.(error.message)
            reject(error)
          }

          if (signal?.aborted) {
            safeReject(createAbortError())
            return
          }

          signal?.addEventListener(
            'abort',
            () => {
              safeReject(createAbortError())
            },
            { once: true }
          )

          pendingStreams.push({
            callbacks,
            signal,
            resolve: safeResolve,
          })
        })
    ),
    fetchSessions: vi.fn(async () => ({ sessions: [] })),
    fetchSessionMessages: vi.fn(async () => ({ messages: [] })),
  }
})

const emitEvent = (stream: PendingStream, event: AgUiEvent): void => {
  stream.callbacks.onEvent?.(event)
}

const getPendingStream = (index: number): PendingStream => {
  const stream = pendingStreams[index]
  if (!stream) {
    throw new Error(`pending stream ${index} not found`)
  }
  return stream
}

describe('useChat', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    pendingStreams.splice(0, pendingStreams.length)
    setActivePinia(createPinia())
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('会话切换后，流式增量仍写回原会话', async () => {
    const { createConversation, sendMessage, selectConversation, activeConversationId, messages } = useChat()

    createConversation()
    const streamConversationId = activeConversationId.value as string

    const sendPromise = sendMessage('hello')
    expect(pendingStreams).toHaveLength(1)
    const stream = getPendingStream(0)

    await selectConversation('markdown-demo')
    emitEvent(stream, {
      type: 'TEXT_MESSAGE_DELTA',
      messageId: 'assistant-1',
      delta: 'hello stream',
    })

    const streamMessages = messages.value[streamConversationId] || []
    const assistantMessage = streamMessages.find((message) => message.role === 'assistant')
    expect(assistantMessage?.content).toContain('hello stream')
    expect((messages.value['markdown-demo'] || []).some((message) => message.content.includes('hello stream'))).toBe(false)

    emitEvent(stream, {
      type: 'RUN_FINISHED',
      threadId: 'thread-1',
      runId: 'run-1',
    })
    stream.resolve()
    await sendPromise
  })

  it('临时会话替换成后端 threadId 后，后续事件仍落到新会话', async () => {
    const { createConversation, sendMessage, selectConversation, activeConversationId, messages } = useChat()

    createConversation()
    const localConversationId = activeConversationId.value as string

    const sendPromise = sendMessage('replace id')
    expect(pendingStreams).toHaveLength(1)
    const stream = getPendingStream(0)

    emitEvent(stream, {
      type: 'RUN_STARTED',
      threadId: 'tree_10001',
      runId: 'run_1',
    })
    expect(activeConversationId.value).toBe('tree_10001')
    expect(messages.value[localConversationId]).toBeUndefined()

    emitEvent(stream, {
      type: 'TEXT_MESSAGE_DELTA',
      messageId: 'assistant-2',
      delta: 'first',
    })

    await selectConversation('reasoning-demo')
    emitEvent(stream, {
      type: 'TEXT_MESSAGE_DELTA',
      messageId: 'assistant-2',
      delta: ' second',
    })

    const replacedMessages = messages.value['tree_10001'] || []
    const replacedAssistant = replacedMessages.find((message) => message.role === 'assistant')
    expect(replacedAssistant?.content).toBe('first second')
    expect((messages.value['reasoning-demo'] || []).some((message) => message.content.includes('first second'))).toBe(false)

    stream.callbacks.onDone?.()
    stream.resolve()
    await sendPromise
  })

  it('新请求会中断旧请求，且旧请求收尾不会清理新请求控制器', async () => {
    const { createConversation, sendMessage } = useChat()
    const chatStore = useChatStore()

    createConversation()

    const firstSendPromise = sendMessage('first')
    expect(pendingStreams).toHaveLength(1)
    const firstStream = getPendingStream(0)

    const secondSendPromise = sendMessage('second')
    expect(pendingStreams).toHaveLength(2)
    const secondStream = getPendingStream(1)

    expect(firstStream.signal?.aborted).toBe(true)
    emitEvent(firstStream, {
      type: 'RUN_FINISHED',
      threadId: 'thread-old',
      runId: 'run-old',
    })
    expect(chatStore.currentAbortController).not.toBeNull()

    secondStream.callbacks.onDone?.()
    secondStream.resolve()

    await Promise.allSettled([firstSendPromise, secondSendPromise])
    expect(chatStore.currentAbortController).toBeNull()
  })

  it('主动停止流式请求时，消息应标记为已停止生成', async () => {
    const { createConversation, sendMessage, stopStreaming, activeConversationId, messages } = useChat()

    createConversation()
    const conversationId = activeConversationId.value as string

    const sendPromise = sendMessage('stop stream')
    expect(pendingStreams).toHaveLength(1)

    stopStreaming()
    await sendPromise

    const assistantMessages = (messages.value[conversationId] || []).filter(
      (message) => message.role === 'assistant'
    )
    expect(
      assistantMessages.some((message) => message.status === 'sent' && message.content === '已停止生成')
    ).toBe(true)
    expect(assistantMessages.some((message) => message.status === 'error')).toBe(false)
  })
})
