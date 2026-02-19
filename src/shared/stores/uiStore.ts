import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { EdgeType, ThemeMode } from '@/shared/types'

const THEME_STORAGE_KEY = 'theme'

const isThemeMode = (value: string): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system'

export const useUiStore = defineStore('ui', () => {
  const theme = ref<ThemeMode>('system')
  const isDark = ref(false)
  const isNavButtonExpanded = ref(false)

  const showSidebar = ref(true)
  const showInspector = ref(true)
  const showBottomPanel = ref(true)
  const edgeType = ref<EdgeType>('smoothstep')

  const mediaQuery = ref<MediaQueryList | null>(null)

  const ensureMediaQuery = (): MediaQueryList | null => {
    if (mediaQuery.value) {
      return mediaQuery.value
    }
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return null
    }
    mediaQuery.value = window.matchMedia('(prefers-color-scheme: dark)')
    return mediaQuery.value
  }

  const getStoredTheme = (): ThemeMode | null => {
    if (typeof localStorage === 'undefined') {
      return null
    }
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
      return savedTheme && isThemeMode(savedTheme) ? savedTheme : null
    } catch {
      return null
    }
  }

  const saveTheme = (newTheme: ThemeMode): void => {
    if (typeof localStorage === 'undefined') {
      return
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    } catch {
      // ignore storage errors to avoid breaking non-browser environments
    }
  }

  const applyTheme = (): void => {
    const query = ensureMediaQuery()
    const shouldBeDark = theme.value === 'system' ? query?.matches ?? false : theme.value === 'dark'
    isDark.value = shouldBeDark

    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', shouldBeDark)
    }
  }

  const handleSystemChange = (): void => {
    if (theme.value === 'system') {
      applyTheme()
    }
  }

  const initTheme = (): void => {
    theme.value = getStoredTheme() ?? 'system'

    const query = ensureMediaQuery()
    query?.removeEventListener('change', handleSystemChange)
    query?.addEventListener('change', handleSystemChange)
    applyTheme()
  }

  const setTheme = (newTheme: ThemeMode): void => {
    theme.value = newTheme
    saveTheme(newTheme)
    applyTheme()
  }

  const cycleTheme = (): void => {
    const modes: ThemeMode[] = ['light', 'dark', 'system']
    const nextIndex = (modes.indexOf(theme.value) + 1) % modes.length
    const nextTheme = modes[nextIndex]
    if (nextTheme) {
      setTheme(nextTheme)
    }
  }

  const setNavButtonExpanded = (expanded: boolean): void => {
    isNavButtonExpanded.value = expanded
  }

  const toggleEdgeType = (): void => {
    edgeType.value = edgeType.value === 'smoothstep' ? 'default' : 'smoothstep'
  }

  return {
    theme,
    isDark,
    isNavButtonExpanded,
    showSidebar,
    showInspector,
    showBottomPanel,
    edgeType,
    initTheme,
    setTheme,
    cycleTheme,
    setNavButtonExpanded,
    toggleEdgeType,
  }
})
