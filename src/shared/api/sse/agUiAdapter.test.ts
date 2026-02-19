import { describe, expect, it, vi } from 'vitest'
import {
  createAgUiStreamAdapter,
  NON_RECOVERABLE_CHAT_STREAM_MESSAGE,
} from '@/shared/api/sse/agUiAdapter'

describe('createAgUiStreamAdapter', () => {
  it('收到 [DONE] 时只触发一次 onDone', () => {
    const onDone = vi.fn()
    const adapter = createAgUiStreamAdapter({ onDone })

    adapter.handleMessage({ data: '[DONE]' })
    adapter.handleMessage({ data: '[DONE]' })

    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('收到 RUN_FINISHED 时触发 onEvent 和 onDone', () => {
    const onDone = vi.fn()
    const onEvent = vi.fn()
    const adapter = createAgUiStreamAdapter({ onDone, onEvent })

    adapter.handleMessage({
      data: JSON.stringify({
        type: 'RUN_FINISHED',
        threadId: 'thread_1',
        runId: 'run_1',
      }),
    })

    expect(onEvent).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('未结束时 ensureCompleted 抛出不可恢复错误提示', () => {
    const adapter = createAgUiStreamAdapter({})

    expect(() => adapter.ensureCompleted()).toThrowError(NON_RECOVERABLE_CHAT_STREAM_MESSAGE)
  })
})
