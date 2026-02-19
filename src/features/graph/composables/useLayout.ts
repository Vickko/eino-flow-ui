import { ref } from 'vue'
import type { EdgeType } from '@/shared/types'

const showSidebar = ref(true)
const showInspector = ref(true)
const showBottomPanel = ref(true)
const edgeType = ref<EdgeType>('smoothstep')

export function useLayout() {
  const toggleEdgeType = (): void => {
    edgeType.value = edgeType.value === 'smoothstep' ? 'default' : 'smoothstep'
  }

  return {
    showSidebar,
    showInspector,
    showBottomPanel,
    edgeType,
    toggleEdgeType,
  }
}
