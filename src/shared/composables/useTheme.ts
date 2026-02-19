import { storeToRefs } from 'pinia'
import type { ThemeMode } from '@/shared/types'
import { usePreferenceStore } from '@/shared/stores/preferenceStore'

export function useTheme() {
  const preferenceStore = usePreferenceStore()
  const { theme, isDark } = storeToRefs(preferenceStore)

  return {
    theme,
    isDark,
    initTheme: preferenceStore.initTheme,
    setTheme: (newTheme: ThemeMode) => preferenceStore.setTheme(newTheme),
    cycleTheme: preferenceStore.cycleTheme,
  }
}
