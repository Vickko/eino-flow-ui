import type {
  AgUiEvent,
  ChatMessageResponse,
  RunAgentInput,
  SessionListResponse,
  SessionMessagesResponse,
} from '@/shared/types'
import { chatApiClient, getChatApiBase, isAuthEnabled, notifyUnauthorized } from '@/shared/api/base'
import { normalizeApiError } from '@/shared/api/errors'
import { requestWithPolicy } from '@/shared/api/request'
import {
  createAgUiStreamAdapter,
  NON_RECOVERABLE_CHAT_STREAM_MESSAGE,
  streamSse,
} from '@/shared/api/sse'

// Chat API - SSE 流式接口
export interface StreamChatCallbacks {
  onEvent?: (event: AgUiEvent) => void // 接收到 AG-UI 事件
  onDone?: () => void // 收到 RUN_FINISHED / RUN_ERROR / [DONE]
  onError?: (error: string) => void // 发生错误
}

export const streamChatMessage = async (
  request: RunAgentInput,
  callbacks: StreamChatCallbacks,
  abortSignal?: AbortSignal
): Promise<void> => {
  const adapter = createAgUiStreamAdapter({
    onEvent: callbacks.onEvent,
    onDone: callbacks.onDone,
  })

  try {
    await streamSse(
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
        onMessage: adapter.handleMessage,
      }
    )

    adapter.ensureCompleted()
  } catch (error) {
    const apiError = normalizeApiError(error, NON_RECOVERABLE_CHAT_STREAM_MESSAGE)
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
      const response = await chatApiClient.get<SessionMessagesResponse>(
        `/api/v1/sessions/${sessionId}`,
        {
          signal,
        }
      )
      return response.data
    },
    {
      retryCount: 1,
      timeoutMs: 10000,
    }
  )
}
