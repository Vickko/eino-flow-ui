import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { ping } from '@/shared/api'
import { useServerStatus } from '@/features/graph/composables/useServerStatus'
import { useServerStatusStore } from '@/features/graph/stores/serverStatusStore'

vi.mock('@/shared/api', () => ({
  ping: vi.fn(),
}))

const mockedPing = vi.mocked(ping)

describe('useServerStatus', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    mockedPing.mockReset()
    mockedPing.mockResolvedValue({ code: 0, msg: 'ok', data: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('无作用域调用后，作用域释放不会误停心跳', () => {
    useServerStatus()
    const store = useServerStatusStore()
    expect(store.heartbeatSubscribers).toBe(1)
    expect(store.isHeartbeatActive).toBe(true)

    const scope = effectScope()
    scope.run(() => {
      useServerStatus()
    })

    expect(store.heartbeatSubscribers).toBe(2)

    scope.stop()
    expect(store.heartbeatSubscribers).toBe(1)
    expect(store.isHeartbeatActive).toBe(true)
  })

  it('重复无作用域调用只保留一个常驻订阅', () => {
    useServerStatus()
    useServerStatus()

    const store = useServerStatusStore()
    expect(store.heartbeatSubscribers).toBe(1)
    expect(store.isHeartbeatActive).toBe(true)
  })
})
