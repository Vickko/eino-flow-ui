import type { AgUiEvent } from '@/shared/types'
import { ApiClientError } from '@/shared/api/errors'
import type { SseMessage } from '@/shared/api/sse/types'
import { parseAgUiEventPayload } from '@/shared/api/sse/guards'

export const NON_RECOVERABLE_CHAT_STREAM_MESSAGE =
  '流式连接中断，当前请求无法自动恢复，请重新发送。'

interface AgUiStreamCallbacks {
  onEvent?: (event: AgUiEvent) => void
  onDone?: () => void
}

export const createAgUiStreamAdapter = (callbacks: AgUiStreamCallbacks) => {
  let doneNotified = false
  let invalidPayloadWarned = false

  const notifyDone = () => {
    if (doneNotified) return
    doneNotified = true
    callbacks.onDone?.()
  }

  const warnInvalidPayloadOnce = (kind: string, payload: string): void => {
    if (invalidPayloadWarned) return
    invalidPayloadWarned = true

    // 只在开发环境提醒一次，避免线上刷屏/影响性能。
    if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return

    const sample = payload.length > 200 ? `${payload.slice(0, 200)}...` : payload
    console.warn('[AG-UI SSE] Ignore invalid payload:', kind, sample)
  }

  const handleMessage = (message: SseMessage): void => {
    const payload = message.data.trim()
    if (!payload) return

    if (payload === '[DONE]') {
      notifyDone()
      return
    }

    const parsed = parseAgUiEventPayload(payload, (info) => {
      warnInvalidPayloadOnce(info.kind, info.payload)
    })
    if (!parsed) {
      // 非预期 payload：忽略即可（避免流式过程中 UI 被异常数据打断）
      return
    }

    callbacks.onEvent?.(parsed)
    if (parsed.type === 'RUN_FINISHED' || parsed.type === 'RUN_ERROR') {
      notifyDone()
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
