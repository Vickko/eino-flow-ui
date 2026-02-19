import { ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  CanvasNode,
  GraphNavigationItem,
  GraphSchema,
  NodeExecutionResult,
} from '@/shared/types'

export const useGraphStore = defineStore('graph', () => {
  const selectedGraphId = ref<string | null>(null)
  const selectedNode = ref<CanvasNode | null>(null)
  const nodeExecutionResults = ref<Record<string, NodeExecutionResult>>({})
  const graphNavigationStack = ref<GraphNavigationItem[]>([])

  const setSelectedGraph = (
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
    if (!subgraphSchema?.id) return
    setSelectedGraph(subgraphSchema.id, subgraphSchema.name ?? subgraphSchema.id, false)
  }

  const navigateBack = (): void => {
    if (graphNavigationStack.value.length <= 1) return
    graphNavigationStack.value.pop()
    const previousGraph = graphNavigationStack.value[graphNavigationStack.value.length - 1]
    if (!previousGraph) return
    selectedGraphId.value = previousGraph.id
    selectedNode.value = null
  }

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
    selectedNode,
    nodeExecutionResults,
    graphNavigationStack,
    setSelectedGraph,
    navigateToSubgraph,
    navigateBack,
    setSelectedNode,
    setNodeExecutionResult,
    clearExecutionResults,
    clearNavigationStack,
  }
})
