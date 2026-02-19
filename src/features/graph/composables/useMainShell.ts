import { onMounted } from 'vue'
import { useTheme } from '@/shared/composables/useTheme'
import { useNavButton } from '@/shared/composables/useNavButton'
import { useGraph } from '@/features/graph/composables/useGraph'
import { useLayout } from '@/features/graph/composables/useLayout'
import { useServerStatus } from '@/features/graph/composables/useServerStatus'

export function useMainShell() {
  const { selectedGraphId } = useGraph()
  const { showSidebar, showInspector, showBottomPanel } = useLayout()
  const { isOnline } = useServerStatus()
  const { initTheme } = useTheme()
  const { isExpanded, handleMouseEnter, handleMouseLeave } = useNavButton()

  onMounted(() => {
    initTheme()
  })

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
