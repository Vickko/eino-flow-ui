import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from '@/shared/stores/uiStore'

const installMatchMediaMock = (matches: boolean): void => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('useUiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    installMatchMediaMock(false)
  })

  it('initTheme 会按系统主题更新暗色状态', () => {
    installMatchMediaMock(true)
    localStorage.setItem('theme', 'system')

    const store = useUiStore()
    store.initTheme()

    expect(store.theme).toBe('system')
    expect(store.isDark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('cycleTheme 会按顺序切换并持久化', () => {
    const store = useUiStore()
    store.initTheme()

    store.cycleTheme()
    expect(store.theme).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')

    store.cycleTheme()
    expect(store.theme).toBe('dark')
    expect(store.isDark).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
