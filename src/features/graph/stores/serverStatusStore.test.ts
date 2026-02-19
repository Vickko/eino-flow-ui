import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ping } from '@/shared/api'
import { useServerStatusStore } from '@/features/graph/stores/serverStatusStore'

vi.mock('@/shared/api', () => ({
  ping: vi.fn(),
}))

const mockedPing = vi.mocked(ping)

describe('useServerStatusStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    mockedPing.mockReset()
    mockedPing.mockResolvedValue({ code: 0, msg: 'ok', data: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('retain/release 会正确管理心跳生命周期', () => {
    const store = useServerStatusStore()

    store.retainHeartbeat()
    expect(store.heartbeatSubscribers).toBe(1)
    expect(store.isHeartbeatActive).toBe(true)
    expect(mockedPing).toHaveBeenCalledTimes(1)

    store.retainHeartbeat()
    expect(store.heartbeatSubscribers).toBe(2)

    store.releaseHeartbeat()
    expect(store.heartbeatSubscribers).toBe(1)
    expect(store.isHeartbeatActive).toBe(true)

    store.releaseHeartbeat()
    expect(store.heartbeatSubscribers).toBe(0)
    expect(store.isHeartbeatActive).toBe(false)
  })

  it('连续失败达到阈值后标记离线，恢复后回到在线', async () => {
    const store = useServerStatusStore()

    mockedPing.mockRejectedValue(new Error('network down'))
    store.startHeartbeat()
    await Promise.resolve()
    expect(store.isOnline).toBe(true)

    await vi.advanceTimersByTimeAsync(500)
    expect(store.isOnline).toBe(false)

    mockedPing.mockResolvedValue({ code: 0, msg: 'ok', data: null })
    await store.checkHeartbeat()
    expect(store.isOnline).toBe(true)
  })
})
