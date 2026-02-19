import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import type { GraphSchema, NodeExecutionResult } from '@/shared/types'
import { useGraphStore } from '@/features/graph/stores/graphStore'

export function useGraph() {
  const graphStore = useGraphStore()
  const { selectedGraphId, selectedNode, nodeExecutionResults, graphNavigationStack } =
    storeToRefs(graphStore)

  const setSelectedGraphId = (
    id: string | null,
    name: string | null = null,
    isNewNavigation = true
  ): void => {
    graphStore.setSelectedGraph(id, name, isNewNavigation)
  }

  const navigateToSubgraph = (subgraphSchema: GraphSchema): void => {
    if (!subgraphSchema?.id) {
      console.error('Invalid subgraph schema:', subgraphSchema)
      return
    }

    graphStore.navigateToSubgraph(subgraphSchema)
  }

  const navigateBack = (): void => {
    graphStore.navigateBack()
  }

  const canNavigateBack = computed(() => graphNavigationStack.value.length > 1)

  const setSelectedNode = graphStore.setSelectedNode

  const setNodeExecutionResult = (nodeKey: string, result: NodeExecutionResult): void => {
    graphStore.setNodeExecutionResult(nodeKey, result)
  }

  const clearExecutionResults = graphStore.clearExecutionResults
  const clearNavigationStack = graphStore.clearNavigationStack

  return {
    selectedGraphId,
    setSelectedGraphId,
    selectedNode,
    setSelectedNode,
    nodeExecutionResults,
    setNodeExecutionResult,
    clearExecutionResults,
    navigateToSubgraph,
    navigateBack,
    canNavigateBack,
    graphNavigationStack,
    clearNavigationStack,
  }
}
