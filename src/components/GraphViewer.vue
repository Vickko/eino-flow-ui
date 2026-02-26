<template>
  <div class="flex-1 h-full relative flex flex-col">
    <GraphFloatingToolbar
      :loading="loading"
      :graph-name="graphName"
      :graph-version="graphVersion"
      :selected-graph-id="selectedGraphId"
      :can-navigate-back="canNavigateBack"
      :graph-navigation-stack="graphNavigationStack"
      :show-sidebar="showSidebar"
      :show-inspector="showInspector"
      :show-bottom-panel="showBottomPanel"
      :edge-type="edgeType"
      @toggle-sidebar="toggleSidebar"
      @toggle-bottom-panel="toggleBottomPanel"
      @toggle-inspector="toggleInspector"
      @toggle-edge-type="toggleEdgeType"
      @navigate-back="navigateBack"
    />

    <GraphCanvas
      v-model="elements"
      :selected-graph-id="selectedGraphId"
      :loading="loading"
      :error="error"
      :is-graph-ready="isGraphReady"
      :controls-style="controlsStyle"
      :minimap-style="minimapStyle"
      @node-click="onNodeClick"
      @pane-ready="onPaneReady"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { fetchGraphCanvas, useGraph, useLayout } from '@/features/graph'
import type { CanvasNode as TCanvasNode } from '@/shared/types'
import GraphCanvas from './graphViewer/GraphCanvas.vue'
import GraphFloatingToolbar from './graphViewer/GraphFloatingToolbar.vue'
import { layoutElements, type FlowEdge, type FlowElement, type FlowNode } from './graphViewer/graphLayout'

interface NodeClickEvent {
  node: {
    data: TCanvasNode
  }
}

interface VueFlowInstance {
  fitView: (options?: { padding?: number; duration?: number }) => Promise<boolean>
  getViewport: () => { x: number; y: number; zoom: number }
  setViewport: (
    viewport: { x: number; y: number; zoom: number },
    options?: { duration?: number }
  ) => void
}

const {
  selectedGraphId,
  selectedNode,
  setSelectedNode,
  canNavigateBack,
  navigateBack,
  graphNavigationStack,
} = useGraph()
const { showSidebar, showInspector, showBottomPanel, edgeType, toggleEdgeType } = useLayout()

const toggleSidebar = (): void => {
  showSidebar.value = !showSidebar.value
}

const toggleInspector = (): void => {
  showInspector.value = !showInspector.value
}

const toggleBottomPanel = (): void => {
  showBottomPanel.value = !showBottomPanel.value
}

const minimapStyle = computed(() => {
  const bottom = showBottomPanel.value ? 'calc(12px + 256px)' : '12px'
  const right = showInspector.value ? 'calc(12px + 320px)' : '12px'
  return { bottom, right }
})

const controlsStyle = computed(() => {
  const bottom = showBottomPanel.value ? 'calc(12px + 256px)' : '12px'
  const left = showSidebar.value ? 'calc(12px + 256px)' : '12px'
  return { bottom, left }
})

const vueFlowInstance = ref<VueFlowInstance | null>(null)

const loading = ref(false)
const error = ref<string | null>(null)
const graphName = ref('')
const graphVersion = ref('')
const elements = ref<FlowElement[]>([])
const isGraphReady = ref(false)

const adjustViewportPosition = (instance: VueFlowInstance): void => {
  const viewport = instance.getViewport()
  const upwardOffset = 160

  instance.setViewport(
    {
      x: viewport.x,
      y: viewport.y - upwardOffset,
      zoom: viewport.zoom,
    },
    { duration: 0 }
  )
}

const loadGraphDetails = async (id: string | null): Promise<void> => {
  error.value = null
  elements.value = []
  setSelectedNode(null)
  isGraphReady.value = false

  if (!id) {
    graphName.value = ''
    graphVersion.value = ''
    return
  }

  loading.value = true

  try {
    const data = await fetchGraphCanvas(id)
    if (data.code === 0 && data.data.canvas_info) {
      const canvas = data.data.canvas_info
      graphName.value = canvas.name
      graphVersion.value = canvas.version

      const nodes = canvas.nodes.map((node) => ({
        id: node.key,
        label: node.key,
        type: 'custom',
        data: { ...node },
      }))

      const edges: FlowEdge[] = canvas.edges.map((edge) => ({
        id: edge.id,
        source: edge.source_node_key,
        target: edge.target_node_key,
        label: edge.name,
        type: edgeType.value,
        animated: true,
        style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2 },
        labelStyle: { fontWeight: 700 },
      }))

      elements.value = layoutElements(nodes, edges)

      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 50))

      if (vueFlowInstance.value) {
        await vueFlowInstance.value.fitView({ padding: 0.3, duration: 0 })
        adjustViewportPosition(vueFlowInstance.value)
      }

      requestAnimationFrame(() => {
        isGraphReady.value = true
      })
    } else {
      error.value = 'Failed to load graph details'
    }
  } catch (err) {
    error.value = `Error: ${err instanceof Error ? err.message : String(err)}`
  } finally {
    loading.value = false
  }
}

const onNodeClick = (event: NodeClickEvent): void => {
  if (selectedNode.value && selectedNode.value.key === event.node.data.key) {
    return
  }
  setSelectedNode(event.node.data)
}

const onPaneReady = (instance: VueFlowInstance): void => {
  vueFlowInstance.value = instance

  setTimeout(() => {
    if (elements.value.length > 0) {
      instance.fitView({ padding: 0.3, duration: 0 })
      adjustViewportPosition(instance)
    }
  }, 100)
}

watch(
  selectedGraphId,
  (newId) => {
    loadGraphDetails(newId)
  },
  { immediate: true }
)

watch(
  selectedNode,
  (newNode) => {
    if (!isGraphReady.value || elements.value.length === 0) {
      return
    }

    elements.value.forEach((el) => {
      if ('data' in el) {
        ;(el as FlowNode).selected = newNode !== null && el.id === newNode.key
      }
    })
  },
  { immediate: false }
)

watch(edgeType, (newType) => {
  if (!isGraphReady.value || elements.value.length === 0) {
    return
  }

  elements.value.forEach((el) => {
    if ('source' in el && 'target' in el) {
      ;(el as FlowEdge).type = newType
    }
  })
})
</script>

<style>
.vue-flow__edge-text {
  font-size: 10px;
}
</style>

