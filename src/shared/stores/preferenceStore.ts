import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ThemeMode } from '@/shared/types'
import { readAppStorage, writeAppStorage } from '@/shared/lib/storage/appStorage'

const isThemeMode = (value: string): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system'

export const usePreferenceStore = defineStore('preference', () => {
  const theme = ref<ThemeMode>('system')
  const isDark = ref(false)
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
    const savedTheme = readAppStorage('theme')
    return savedTheme && isThemeMode(savedTheme) ? savedTheme : null
  }

  const saveTheme = (nextTheme: ThemeMode): void => {
    writeAppStorage('theme', nextTheme)
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

  const setTheme = (nextTheme: ThemeMode): void => {
    theme.value = nextTheme
    saveTheme(nextTheme)
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

  return {
    theme,
    isDark,
    initTheme,
    setTheme,
    cycleTheme,
  }
})
