<script setup lang="ts">
import { computed } from 'vue'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { PanOnScrollMode, VueFlow } from '@vue-flow/core'
import CustomNode from '@/components/CustomNode.vue'
import type { CanvasNode } from '@/shared/types'
import type { FlowElement } from './graphLayout'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

const props = defineProps<{
  modelValue: FlowElement[]
  selectedGraphId: string | null
  loading: boolean
  error: string | null
  isGraphReady: boolean
  minimapStyle: Record<string, string>
  controlsStyle: Record<string, string>
}>()

interface NodeClickEvent {
  node: {
    data: CanvasNode
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

const emit = defineEmits<{
  'update:modelValue': [value: FlowElement[]]
  nodeClick: [event: NodeClickEvent]
  paneReady: [instance: VueFlowInstance]
}>()

const elements = computed({
  get: () => props.modelValue,
  set: (value: FlowElement[]) => emit('update:modelValue', value),
})
</script>

<template>
  <div class="flex-1 h-full relative flex flex-col">
    <!-- Loading State -->
    <div
      v-if="props.loading"
      class="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm"
    >
      <div class="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin mb-4"></div>
      <p class="text-muted-foreground font-medium">Loading Graph...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="props.error" class="absolute inset-0 flex items-center justify-center p-8">
      <div class="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md text-center">
        <div class="text-destructive font-medium mb-2">Error Loading Graph</div>
        <div class="text-destructive/80 text-sm">{{ props.error }}</div>
      </div>
    </div>

    <div v-if="!props.loading && !props.error" class="flex-1 flex flex-col h-full overflow-hidden relative">
      <div
        v-if="!props.selectedGraphId"
        class="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/20"
      >
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

      <div v-else class="flex-1 relative">
        <VueFlow
          v-model="elements"
          :default-zoom="1"
          :min-zoom="0.2"
          :max-zoom="4"
          :fit-view-on-init="true"
          :pan-on-scroll="true"
          :pan-on-scroll-mode="PanOnScrollMode.Free"
          :pan-on-scroll-speed="0.5"
          :zoom-on-scroll="true"
          zoom-activation-key-code="Control"
          :zoom-on-pinch="true"
          class="h-full w-full transition-opacity duration-300"
          :class="{ 'opacity-0': !props.isGraphReady, 'opacity-100': props.isGraphReady }"
          @node-click="(event) => emit('nodeClick', event)"
          @pane-ready="(instance) => emit('paneReady', instance)"
        >
          <template #node-custom="slotProps">
            <CustomNode :data="slotProps.data" :selected="slotProps.selected" />
          </template>

          <Background pattern-color="#94a3b8" :gap="16" />
          <Controls
            class="bg-card border border-border shadow-panel rounded-md overflow-hidden transition-all duration-300"
            :style="props.controlsStyle"
          />
          <MiniMap
            class="border border-border shadow-panel rounded-md overflow-hidden transition-all duration-300"
            :style="props.minimapStyle"
          />
        </VueFlow>
      </div>
    </div>
  </div>
</template>
