<script setup lang="ts">
import { computed } from 'vue'
import type { CanvasNode } from '@/shared/types'

const props = defineProps<{
  node: CanvasNode
}>()

const nodeTypeColor = computed((): string => {
  if (props.node.graph_schema) {
    return 'bg-amber-500'
  }

  const type = props.node.type?.toLowerCase() ?? ''
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
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Node Type
      </div>
      <div
        class="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono truncate max-w-[150px] border border-primary/20"
      >
        {{ props.node.key }}
      </div>
    </div>
    <div class="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
      <span
        class="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]"
        :class="nodeTypeColor"
      ></span>
      <span class="text-sm font-medium text-foreground">{{ props.node.type }}</span>
    </div>
  </div>
</template>

