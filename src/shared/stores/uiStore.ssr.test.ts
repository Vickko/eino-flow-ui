// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('useUiStore (SSR)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('在无 window 环境也能初始化', async () => {
    const { useUiStore } = await import('./uiStore')
    const store = useUiStore()

    expect(() => store.initTheme()).not.toThrow()
    expect(() => store.setTheme('dark')).not.toThrow()
    expect(store.isDark).toBe(true)
  })
})
