// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('useUiStore (SSR)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('在无 window 环境也能操作临时 UI 状态', async () => {
    const { useUiStore } = await import('./uiStore')
    const store = useUiStore()

    expect(() => store.setNavButtonExpanded(true)).not.toThrow()
    expect(() => store.toggleEdgeType()).not.toThrow()
    expect(store.isNavButtonExpanded).toBe(true)
  })
})
