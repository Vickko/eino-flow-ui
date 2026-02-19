import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from '@/shared/stores/uiStore'

describe('useUiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('会更新布局相关状态', () => {
    const store = useUiStore()
    store.setNavButtonExpanded(true)
    store.showSidebar = false
    store.showInspector = false
    store.showBottomPanel = false

    expect(store.isNavButtonExpanded).toBe(true)
    expect(store.showSidebar).toBe(false)
    expect(store.showInspector).toBe(false)
    expect(store.showBottomPanel).toBe(false)
  })

  it('toggleEdgeType 会在两种边类型间切换', () => {
    const store = useUiStore()
    expect(store.edgeType).toBe('smoothstep')

    store.toggleEdgeType()
    expect(store.edgeType).toBe('default')
    store.toggleEdgeType()
    expect(store.edgeType).toBe('smoothstep')
  })
})
