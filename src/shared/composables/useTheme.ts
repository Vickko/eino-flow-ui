import { storeToRefs } from 'pinia'
import type { ThemeMode } from '@/shared/types'
import { useUiStore } from '@/shared/stores/uiStore'

export function useTheme() {
  const uiStore = useUiStore()
  const { theme, isDark } = storeToRefs(uiStore)

  return {
    theme,
    isDark,
    initTheme: uiStore.initTheme,
    setTheme: (newTheme: ThemeMode) => uiStore.setTheme(newTheme),
    cycleTheme: uiStore.cycleTheme,
  }
}
