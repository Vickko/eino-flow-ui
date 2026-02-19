import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { EdgeType } from '@/shared/types'

export const useUiStore = defineStore('ui', () => {
  const isNavButtonExpanded = ref(false)

  const showSidebar = ref(true)
  const showInspector = ref(true)
  const showBottomPanel = ref(true)
  const edgeType = ref<EdgeType>('smoothstep')

  const setNavButtonExpanded = (expanded: boolean): void => {
    isNavButtonExpanded.value = expanded
  }

  const toggleEdgeType = (): void => {
    edgeType.value = edgeType.value === 'smoothstep' ? 'default' : 'smoothstep'
  }

  return {
    isNavButtonExpanded,
    showSidebar,
    showInspector,
    showBottomPanel,
    edgeType,
    setNavButtonExpanded,
    toggleEdgeType,
  }
})
