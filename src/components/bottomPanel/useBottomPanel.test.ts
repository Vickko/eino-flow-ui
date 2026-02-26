import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useBottomPanel } from '@/components/bottomPanel/useBottomPanel'

describe('useBottomPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes without throwing (immediate watchers should not crash)', () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    expect(() => {
      const TestComponent = defineComponent({
        setup() {
          // We only care that the composable can run during component setup without crashing.
          useBottomPanel()
          return () => h('div')
        },
      })

      const host = document.createElement('div')
      document.body.appendChild(host)

      const app = createApp(TestComponent)
      app.use(pinia)

      app.mount(host)
      app.unmount()
      host.remove()
    }).not.toThrow()
  })
})
