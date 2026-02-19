import { storeToRefs } from 'pinia'
import { useUiStore } from '@/shared/stores/uiStore'

export function useLayout() {
  const uiStore = useUiStore()
  const { showSidebar, showInspector, showBottomPanel, edgeType } = storeToRefs(uiStore)

  return {
    showSidebar,
    showInspector,
    showBottomPanel,
    edgeType,
    toggleEdgeType: uiStore.toggleEdgeType,
  }
}
