<template>
  <div class="flex-1 h-full relative flex flex-col">
    <!-- Loading State -->
    <div v-if="loading" class="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
      <div class="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin mb-4"></div>
      <p class="text-muted-foreground font-medium">Loading Graph...</p>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="absolute inset-0 flex items-center justify-center p-8">
      <div class="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md text-center">
        <div class="text-destructive font-medium mb-2">Error Loading Graph</div>
        <div class="text-destructive/80 text-sm">{{ error }}</div>
      </div>
    </div>

    <!-- Empty State -->
    <!-- Hover Trigger Zone -->
    <div
      class="absolute top-0 left-0 right-0 h-8 z-[60]"
      @mouseenter="show"
      @mouseleave="hide"
    ></div>

    <!-- Floating Toolbar -->
    <Teleport to="body">
      <div
        class="fixed top-0 left-0 right-0 z-[9999] flex justify-center transition-transform duration-300 ease-in-out pointer-events-none"
        :class="showToolbar ? 'translate-y-4' : '-translate-y-full'"
      >
        <div
          class="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-4 pointer-events-auto transition-all duration-300 ease-in-out"
          @mouseenter="show"
          @mouseleave="hide"
        >
        <!-- Left Panel Toggle -->
        <button
          @click="showSidebar = !showSidebar"
          class="flex items-center justify-center w-6 h-6 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer"
          :class="{ 'text-primary': showSidebar }"
          title="Toggle Sidebar"
        >
          <PanelLeft class="w-4 h-4" />
        </button>

        <div class="h-3 w-px bg-border"></div>

        <div
          class="transition-[width] duration-300 ease-in-out overflow-hidden"
          :style="{ width: typeof wrapperWidth === 'number' ? wrapperWidth + 'px' : wrapperWidth }"
        >
          <div ref="contentRef" class="w-max flex items-center justify-center min-w-[24px]">
            <Transition
              mode="out-in"
              enter-active-class="transition-all duration-200 ease-in-out"
              leave-active-class="transition-all duration-200 ease-in-out"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div v-if="loading" class="flex items-center justify-center px-2 h-6">
                <Loader2 class="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
              <div v-else class="flex items-center">
                <h2 class="font-semibold text-foreground text-sm">{{ graphName || 'No Graph Selected' }}</h2>
                <div v-if="selectedGraphId" class="flex items-center gap-3 whitespace-nowrap ml-3">
                  <span class="w-px h-4 bg-border"></span>
                  <div class="flex items-center gap-2 text-xs text-muted-foreground">
                    <span class="font-mono">{{ selectedGraphId }}</span>
                    <span>v{{ graphVersion }}</span>
                  </div>
                  <div class="flex items-center gap-2 ml-2">
                    <span class="px-2 py-0.5 bg-green-500/10 text-green-600 text-[10px] font-medium rounded-full uppercase tracking-wider">Active</span>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="h-3 w-px bg-border"></div>

        <!-- Bottom Panel Toggle -->
        <button
          @click="showBottomPanel = !showBottomPanel"
          class="flex items-center justify-center w-6 h-6 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer"
          :class="{ 'text-primary': showBottomPanel }"
          title="Toggle Bottom Panel"
        >
          <PanelBottom class="w-4 h-4" />
        </button>

        <!-- Right Panel Toggle -->
        <button
          @click="showInspector = !showInspector"
          class="flex items-center justify-center w-6 h-6 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer"
          :class="{ 'text-primary': showInspector }"
          title="Toggle Inspector"
        >
          <PanelRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </Teleport>

    <div v-if="!loading && !error" class="flex-1 flex flex-col h-full overflow-hidden relative">
      <!-- Empty State -->
      <div v-if="!selectedGraphId" class="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
        <div class="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6 shadow-sm">
          <svg class="w-12 h-12 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-foreground mb-2">No Graph Selected</h3>
        <p class="text-muted-foreground max-w-xs text-center leading-relaxed">
          Select a graph from the sidebar to visualize its structure and inspect nodes.
        </p>
      </div>
      
      <!-- Canvas -->
      <div v-else class="flex-1 relative" ref="graphContainer">
        <VueFlow
          v-model="elements"
          :default-zoom="1"
          :min-zoom="0.2"
          :max-zoom="4"
          :fit-view-on-init="true"
          class="h-full w-full transition-opacity duration-300"
          :class="{ 'opacity-0': !isGraphReady, 'opacity-100': isGraphReady }"
          @node-click="onNodeClick"
          @pane-ready="onPaneReady"
        >
          <template #node-custom="props">
            <CustomNode :data="props.data" :selected="props.selected" />
          </template>
          
          <Background pattern-color="#94a3b8" :gap="16" />
          <Controls
            class="bg-card border border-border shadow-panel rounded-md overflow-hidden transition-all duration-300"
            :style="controlsStyle"
          />
          <MiniMap
            class="border border-border shadow-panel rounded-md overflow-hidden transition-all duration-300"
            :style="minimapStyle"
          />
        </VueFlow>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import { PanelLeft, PanelRight, PanelBottom, Loader2 } from 'lucide-vue-next';
import dagre from 'dagre';
import { fetchGraphCanvas } from '../api';
import CustomNode from './CustomNode.vue';
import { useGraph } from '../composables/useGraph';
import { useLayout } from '@/composables/useLayout';

// Import styles
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';

const { selectedGraphId, setSelectedNode } = useGraph();
const { showSidebar, showInspector, showBottomPanel } = useLayout();

const vueFlowInstance = ref(null);
const graphContainer = ref(null);

const showToolbar = ref(false);
let hideTimeout;
const contentRef = ref(null);

const minimapStyle = computed(() => {
  const bottom = showBottomPanel.value ? 'calc(12px + 256px)' : '12px';
  const right = showInspector.value ? 'calc(12px + 320px)' : '12px';
  return {
    bottom,
    right,
  };
});

const controlsStyle = computed(() => {
  const bottom = showBottomPanel.value ? 'calc(12px + 256px)' : '12px';
  const left = showSidebar.value ? 'calc(12px + 256px)' : '12px';
  return {
    bottom,
    left,
  };
});
const wrapperWidth = ref('auto');
let resizeObserver;

onMounted(() => {
  if (contentRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        wrapperWidth.value = entry.contentRect.width;
      }
    });
    resizeObserver.observe(contentRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

const show = () => {
  clearTimeout(hideTimeout);
  showToolbar.value = true;
};

const hide = () => {
  hideTimeout = setTimeout(() => {
    showToolbar.value = false;
  }, 300);
};

const loading = ref(false);
const error = ref(null);
const graphName = ref('');
const graphVersion = ref('');
const elements = ref([]);
const isGraphReady = ref(false);

// Dagre layout function
const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 240, height: 150 }); // Approximate size
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return [
    ...nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: { x: nodeWithPosition.x, y: nodeWithPosition.y },
      };
    }),
    ...edges,
  ];
};


const loadGraphDetails = async (id) => {
  // Reset state first
  error.value = null;
  elements.value = [];
  setSelectedNode(null); // Clear selection
  isGraphReady.value = false;
  
  if (!id) {
    graphName.value = '';
    graphVersion.value = '';
    return;
  }
  
  loading.value = true;

  try {
    const data = await fetchGraphCanvas(id);
    if (data.code === 0 && data.data.canvas_info) {
      const canvas = data.data.canvas_info;
      graphName.value = canvas.name;
      graphVersion.value = canvas.version;

      const nodes = canvas.nodes.map(node => ({
        id: node.key,
        label: node.key,
        type: 'custom',
        data: { ...node },
      }));

      const edges = canvas.edges.map(edge => ({
        id: edge.id,
        source: edge.source_node_key,
        target: edge.target_node_key,
        label: edge.name,
        type: 'smoothstep',
        animated: true,
        style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2 },
        labelStyle: { fontWeight: 700 }
      }));

      elements.value = getLayoutedElements(nodes, edges);

      // Wait for DOM update then fit view
      await nextTick();
      
      // Give Vue Flow a moment to render nodes and calculate dimensions
      await new Promise(resolve => setTimeout(resolve, 50));

      if (vueFlowInstance.value) {
        await vueFlowInstance.value.fitView({ padding: 0.3, duration: 0 });

        // Adjust viewport to move content upward (for graph switching)
        adjustViewportPosition(vueFlowInstance.value);
      }

      // Use requestAnimationFrame to ensure the fitView has been applied before showing
      requestAnimationFrame(() => {
        isGraphReady.value = true;
      });
    } else {
      error.value = 'Failed to load graph details';
    }
  } catch (err) {
    error.value = `Error: ${err.message}`;
  } finally {
    loading.value = false;
  }
};

// Helper function to adjust viewport position upward
const adjustViewportPosition = (instance) => {
  const viewport = instance.getViewport();
  const upwardOffset = 160; // Fixed pixel offset upward

  instance.setViewport({
    x: viewport.x,
    y: viewport.y - upwardOffset,
    zoom: viewport.zoom
  }, { duration: 0 });
};

const onNodeClick = (event) => {
  setSelectedNode(event.node.data);
};

const onPaneReady = (instance) => {
  vueFlowInstance.value = instance;

  // Adjust viewport on initial load
  setTimeout(() => {
    if (elements.value.length > 0) {
      instance.fitView({ padding: 0.3, duration: 0 });
      adjustViewportPosition(instance);
    }
  }, 100);
};

watch(selectedGraphId, (newId) => {
  loadGraphDetails(newId);
});
</script>

<style>
/* Override some Vue Flow defaults if needed */
.vue-flow__edge-text {
  font-size: 10px;
}
</style>