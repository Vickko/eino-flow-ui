import { ref, computed } from 'vue'
import type { CanvasNode, GraphNavigationItem, NodeExecutionResult, GraphSchema } from '@/types'

const selectedGraphId = ref<string | null>(null)
const selectedNode = ref<CanvasNode | null>(null)
const nodeExecutionResults = ref<Record<string, NodeExecutionResult>>({})
const graphNavigationStack = ref<GraphNavigationItem[]>([])

export function useGraph() {
  const setSelectedGraphId = (
    id: string | null,
    name: string | null = null,
    isNewNavigation = true
  ): void => {
    selectedGraphId.value = id
    selectedNode.value = null

    if (name !== null && id) {
      if (isNewNavigation) {
        graphNavigationStack.value = [{ id, name }]
      } else {
        const existingIndex = graphNavigationStack.value.findIndex((item) => item.id === id)
        if (existingIndex === -1) {
          graphNavigationStack.value.push({ id, name })
        } else {
          graphNavigationStack.value = graphNavigationStack.value.slice(0, existingIndex + 1)
        }
      }
    } else if (id === '' || id === null) {
      graphNavigationStack.value = []
    }
  }

  const navigateToSubgraph = (subgraphSchema: GraphSchema): void => {
    if (!subgraphSchema?.id) {
      console.error('Invalid subgraph schema:', subgraphSchema)
      return
    }

    setSelectedGraphId(subgraphSchema.id, subgraphSchema.name ?? subgraphSchema.id, false)
  }

  const navigateBack = (): void => {
    if (graphNavigationStack.value.length > 1) {
      graphNavigationStack.value.pop()
      const previousGraph = graphNavigationStack.value[graphNavigationStack.value.length - 1]
      if (previousGraph) {
        selectedGraphId.value = previousGraph.id
        selectedNode.value = null
      }
    }
  }

  const canNavigateBack = computed(() => graphNavigationStack.value.length > 1)

  const setSelectedNode = (node: CanvasNode | null): void => {
    selectedNode.value = node
  }

  const setNodeExecutionResult = (nodeKey: string, result: NodeExecutionResult): void => {
    nodeExecutionResults.value = {
      ...nodeExecutionResults.value,
      [nodeKey]: result,
    }
  }

  const clearExecutionResults = (): void => {
    nodeExecutionResults.value = {}
  }

  const clearNavigationStack = (): void => {
    graphNavigationStack.value = []
  }

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
