import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useApiConfigStore } from '@/shared/stores/apiConfigStore'
import { readAppStorage } from '@/shared/lib/storage/appStorage'

describe('useApiConfigStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('会迁移旧 key，并在默认同源模式下纠正 legacy 地址', () => {
    localStorage.setItem('devops_api_base_url', 'http://localhost:52538/eino/devops')

    const store = useApiConfigStore()
    const envApiBase = import.meta.env.VITE_API_BASE_URL
    const shouldDefaultToSameOrigin =
      !(typeof envApiBase === 'string' && envApiBase.trim() !== '')
    const expectedApiBase = shouldDefaultToSameOrigin
      ? window.location.origin
      : 'http://localhost:52538'

    expect(store.apiBaseUrl).toBe(expectedApiBase)
    expect(readAppStorage('apiBaseUrl')).toBe(expectedApiBase)
  })

  it('updateApiBaseUrl 会归一化并持久化', () => {
    const store = useApiConfigStore()
    store.updateApiBaseUrl('https://devops.vickko.com/eino/devops/')

    expect(store.apiBaseUrl).toBe('https://devops.vickko.com')
    expect(readAppStorage('apiBaseUrl')).toBe('https://devops.vickko.com')
  })

  it('localStorage 抛错时也能完成初始化', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    const envApiBase = import.meta.env.VITE_API_BASE_URL
    const expectedApiBase =
      typeof envApiBase === 'string' && envApiBase.trim() !== ''
        ? envApiBase.trim()
        : window.location.origin

    expect(() => {
      useApiConfigStore()
    }).not.toThrow()

    const store = useApiConfigStore()
    expect(store.apiBaseUrl).toBe(expectedApiBase)
  })
})
