<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import type { CanvasNode } from '@/types'
import { formatSchemaType } from '@/utils/schema'

const props = defineProps<{
  data: CanvasNode
  selected?: boolean
}>()

const statusColor = computed(() => {
  if (props.data.graph_schema) {
    return 'bg-amber-500'
  }

  const type = props.data.type?.toLowerCase() ?? ''
  switch (type) {
    case 'start':
      return 'bg-emerald-500'
    case 'end':
      return 'bg-rose-500'
    case 'lambda':
      return 'bg-blue-500'
    case 'chain':
      return 'bg-purple-500'
    case 'chatmodel':
      return 'bg-indigo-500'
    case 'tool':
      return 'bg-amber-500'
    default:
      return 'bg-zinc-400'
  }
})
</script>

<template>
  <div
    class="group relative min-w-[200px] bg-card rounded-lg border transition-all duration-200"
    :class="[
      selected
        ? 'border-primary shadow-[0_0_0_2px_rgba(99,102,241,0.2)]'
        : 'border-border hover:border-primary/50 hover:shadow-sm',
    ]"
  >
    <!-- Handles -->
    <Handle
      type="target"
      :position="Position.Left"
      class="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background transition-colors group-hover:!bg-primary"
    />

    <!-- Header -->
    <div
      class="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/30 rounded-t-lg"
    >
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full" :class="statusColor"></span>
        <span class="text-xs font-mono text-muted-foreground uppercase tracking-wider">{{
          data.type
        }}</span>
      </div>
      <!-- Optional Icon or Status -->
    </div>

    <!-- Body -->
    <div class="p-3">
      <div class="font-medium text-card-foreground text-sm mb-2">{{ data.key }}</div>

      <!-- IO Info -->
      <div v-if="data.component_schema" class="space-y-1">
        <div class="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>In:</span>
          <span class="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">{{
            formatSchemaType(data.component_schema.input_type)
          }}</span>
        </div>
        <div class="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Out:</span>
          <span class="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">{{
            formatSchemaType(data.component_schema.output_type)
          }}</span>
        </div>
      </div>

      <!-- Nested Graph Indicator -->
      <div
        v-if="data.graph_schema"
        class="mt-3 pt-2 border-t border-border flex items-center gap-1.5 text-[10px] text-amber-600 font-medium"
      >
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        Contains Subgraph
      </div>
    </div>

    <Handle
      type="source"
      :position="Position.Right"
      class="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background transition-colors group-hover:!bg-primary"
    />
  </div>
</template>
