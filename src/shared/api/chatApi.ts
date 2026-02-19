import type {
  AgUiEvent,
  ChatMessageResponse,
  RunAgentInput,
  SessionListResponse,
  SessionMessagesResponse,
} from '@/shared/types'
import {
  chatApiClient,
  getChatApiBase,
  isAuthEnabled,
  notifyUnauthorized,
} from '@/shared/api/base'
import { normalizeApiError } from '@/shared/api/errors'
import { fetchWithPolicy, requestWithPolicy } from '@/shared/api/request'

// Chat API - SSE 流式接口
export interface StreamChatCallbacks {
  onEvent?: (event: AgUiEvent) => void // 接收到 AG-UI 事件
  onDone?: () => void // 收到 RUN_FINISHED / RUN_ERROR / [DONE]
  onError?: (error: string) => void // 发生错误
}

const isAgUiEvent = (value: unknown): value is AgUiEvent => {
  if (typeof value !== 'object' || value === null) return false
  if (!('type' in value)) return false
  return typeof (value as { type?: unknown }).type === 'string'
}

const parseSSEEventBlock = (
  block: string,
  callbacks: StreamChatCallbacks,
  notifyDone: () => void
): void => {
  const lines = block.split('\n')
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (dataLines.length === 0) return

  const payload = dataLines.join('\n').trim()
  if (!payload) return
  if (payload === '[DONE]') {
    notifyDone()
    return
  }

  try {
    const parsed = JSON.parse(payload) as unknown
    if (!isAgUiEvent(parsed)) return

    callbacks.onEvent?.(parsed)
    if (parsed.type === 'RUN_FINISHED' || parsed.type === 'RUN_ERROR') {
      notifyDone()
    }
  } catch {
    console.warn('Ignore invalid SSE event payload:', payload)
  }
}

export const streamChatMessage = async (
  request: RunAgentInput,
  callbacks: StreamChatCallbacks,
  abortSignal?: AbortSignal
): Promise<void> => {
  try {
    const response = await fetchWithPolicy(
      `${getChatApiBase()}/api/v1/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        ...(isAuthEnabled && { credentials: 'include' }),
      },
      {
        signal: abortSignal,
        retryCount: 0,
        timeoutMs: 0,
        onUnauthorized: notifyUnauthorized,
      }
    )

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let doneNotified = false
    const notifyDone = () => {
      if (doneNotified) return
      doneNotified = true
      callbacks.onDone?.()
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

      let eventSeparatorIndex = buffer.indexOf('\n\n')
      while (eventSeparatorIndex !== -1) {
        const eventBlock = buffer.slice(0, eventSeparatorIndex)
        buffer = buffer.slice(eventSeparatorIndex + 2)
        parseSSEEventBlock(eventBlock, callbacks, notifyDone)
        eventSeparatorIndex = buffer.indexOf('\n\n')
      }
    }

    if (buffer.trim()) {
      parseSSEEventBlock(buffer, callbacks, notifyDone)
    }

    if (!doneNotified) {
      throw new Error('Stream ended before completion event')
    }
  } catch (error) {
    const apiError = normalizeApiError(error, 'Stream chat message failed')
    console.error('Error streaming chat message:', apiError)
    callbacks.onError?.(apiError.message)
    throw apiError
  }
}

// 保留原有的非流式 API（用于兼容）
export const sendChatMessage = async (request: RunAgentInput): Promise<ChatMessageResponse> => {
  let content = ''
  let reasoningContent = ''
  let runErrorMessage = ''

  await streamChatMessage(request, {
    onEvent: (event) => {
      switch (event.type) {
        case 'TEXT_MESSAGE_DELTA':
          content += event.delta
          break
        case 'TEXT_MESSAGE_REASONING_DELTA':
          reasoningContent += event.delta
          break
        case 'RUN_ERROR':
          runErrorMessage = event.message
          break
      }
    },
  })

  if (runErrorMessage) {
    throw new Error(runErrorMessage)
  }

  return {
    role: 'assistant',
    content,
    reasoning_content: reasoningContent || undefined,
  }
}

// Session API - 获取会话列表
export const fetchSessions = async (): Promise<SessionListResponse> => {
  return requestWithPolicy(
    async (signal) => {
      const response = await chatApiClient.get<SessionListResponse>('/api/v1/sessions', { signal })
      return response.data
    },
    {
      retryCount: 1,
      timeoutMs: 10000,
    }
  )
}

// Session API - 获取会话消息列表
export const fetchSessionMessages = async (sessionId: string): Promise<SessionMessagesResponse> => {
  return requestWithPolicy(
    async (signal) => {
      const response = await chatApiClient.get<SessionMessagesResponse>(`/api/v1/sessions/${sessionId}`, {
        signal,
      })
      return response.data
    },
    {
      retryCount: 1,
      timeoutMs: 10000,
    }
  )
}
