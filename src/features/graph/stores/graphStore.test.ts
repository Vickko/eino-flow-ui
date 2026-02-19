import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGraphStore } from '@/features/graph/stores/graphStore'

describe('useGraphStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('navigateToSubgraph 和 navigateBack 会维护导航栈', () => {
    const store = useGraphStore()
    store.setSelectedGraph('root', 'Root')
    store.navigateToSubgraph({ id: 'child', name: 'Child' })
    store.navigateToSubgraph({ id: 'leaf', name: 'Leaf' })

    expect(store.graphNavigationStack).toEqual([
      { id: 'root', name: 'Root' },
      { id: 'child', name: 'Child' },
      { id: 'leaf', name: 'Leaf' },
    ])

    store.navigateBack()

    expect(store.selectedGraphId).toBe('child')
    expect(store.graphNavigationStack).toEqual([
      { id: 'root', name: 'Root' },
      { id: 'child', name: 'Child' },
    ])
  })

  it('切回已有图时会裁剪导航栈', () => {
    const store = useGraphStore()
    store.setSelectedGraph('root', 'Root')
    store.navigateToSubgraph({ id: 'child', name: 'Child' })
    store.navigateToSubgraph({ id: 'leaf', name: 'Leaf' })

    store.setSelectedGraph('child', 'Child', false)

    expect(store.graphNavigationStack).toEqual([
      { id: 'root', name: 'Root' },
      { id: 'child', name: 'Child' },
    ])
    expect(store.selectedGraphId).toBe('child')
  })
})
