import type { AgUiEvent } from '@/shared/types'
import { ApiClientError } from '@/shared/api/errors'
import type { SseMessage } from '@/shared/api/sse/types'

export const NON_RECOVERABLE_CHAT_STREAM_MESSAGE =
  '流式连接中断，当前请求无法自动恢复，请重新发送。'

interface AgUiStreamCallbacks {
  onEvent?: (event: AgUiEvent) => void
  onDone?: () => void
}

const isAgUiEvent = (value: unknown): value is AgUiEvent => {
  if (typeof value !== 'object' || value === null) return false
  if (!('type' in value)) return false
  return typeof (value as { type?: unknown }).type === 'string'
}

export const createAgUiStreamAdapter = (callbacks: AgUiStreamCallbacks) => {
  let doneNotified = false

  const notifyDone = () => {
    if (doneNotified) return
    doneNotified = true
    callbacks.onDone?.()
  }

  const handleMessage = (message: SseMessage): void => {
    const payload = message.data.trim()
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

  const ensureCompleted = (): void => {
    if (doneNotified) return
    throw new ApiClientError({
      kind: 'unknown',
      message: NON_RECOVERABLE_CHAT_STREAM_MESSAGE,
      retryable: false,
    })
  }

  return {
    handleMessage,
    ensureCompleted,
  }
}
