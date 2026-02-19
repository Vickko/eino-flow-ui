import { ref } from 'vue'
import type { ThemeMode } from '@/shared/types'

const theme = ref<ThemeMode>('system')
const isDark = ref(false)

export function useTheme() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const applyTheme = (): void => {
    let shouldBeDark = false
    if (theme.value === 'system') {
      shouldBeDark = mediaQuery.matches
    } else {
      shouldBeDark = theme.value === 'dark'
    }

    isDark.value = shouldBeDark

    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleSystemChange = (): void => {
    if (theme.value === 'system') {
      applyTheme()
    }
  }

  const initTheme = (): void => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      theme.value = savedTheme as ThemeMode
    } else {
      theme.value = 'system'
    }

    mediaQuery.removeEventListener('change', handleSystemChange)
    mediaQuery.addEventListener('change', handleSystemChange)

    applyTheme()
  }

  const setTheme = (newTheme: ThemeMode): void => {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    applyTheme()
  }

  const cycleTheme = (): void => {
    const modes: ThemeMode[] = ['light', 'dark', 'system']
    const nextIndex = (modes.indexOf(theme.value) + 1) % modes.length
    setTheme(modes[nextIndex] as ThemeMode)
  }

  return {
    theme,
    isDark,
    initTheme,
    setTheme,
    cycleTheme,
  }
}
