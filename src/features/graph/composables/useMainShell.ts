// Theme is initialized at app bootstrap (src/main.ts).
import { useNavButton } from '@/shared/composables/useNavButton'
import { useGraph } from '@/features/graph/composables/useGraph'
import { useLayout } from '@/features/graph/composables/useLayout'
import { useServerStatus } from '@/features/graph/composables/useServerStatus'

export function useMainShell() {
  const { selectedGraphId } = useGraph()
  const { showSidebar, showInspector, showBottomPanel } = useLayout()
  const { isOnline } = useServerStatus()
  const { isExpanded, handleMouseEnter, handleMouseLeave } = useNavButton()

  return {
    selectedGraphId,
    showSidebar,
    showInspector,
    showBottomPanel,
    isOnline,
    isExpanded,
    handleMouseEnter,
    handleMouseLeave,
  }
}
