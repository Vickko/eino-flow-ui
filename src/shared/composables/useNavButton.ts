import { storeToRefs } from 'pinia'
import { useUiStore } from '@/shared/stores/uiStore'

export function useNavButton() {
  const uiStore = useUiStore()
  const { isNavButtonExpanded } = storeToRefs(uiStore)

  const handleMouseEnter = () => {
    uiStore.setNavButtonExpanded(true)
  }

  const handleMouseLeave = () => {
    uiStore.setNavButtonExpanded(false)
  }

  return {
    isExpanded: isNavButtonExpanded,
    handleMouseEnter,
    handleMouseLeave,
  }
}
