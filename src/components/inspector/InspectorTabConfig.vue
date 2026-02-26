<script setup lang="ts">
import { computed } from 'vue'
import { formatSchemaType } from '@/shared/utils/schema'
import type { CanvasNode } from '@/shared/types'

const props = defineProps<{
  node: CanvasNode
}>()

const formattedConfig = computed((): string => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { component_schema, graph_schema, ...rest } = props.node
  return JSON.stringify(rest, null, 2)
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-3">
      <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Properties
      </div>
      <div
        class="p-3 bg-muted/20 rounded-lg border border-border/50 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre custom-scrollbar"
      >
        {{ formattedConfig }}
      </div>
    </div>

    <div v-if="props.node.component_schema" class="space-y-4">
      <div class="space-y-2">
        <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Input Schema
        </div>
        <div
          class="p-2.5 bg-muted/20 rounded-lg border border-border/50 text-xs text-muted-foreground font-mono break-all"
        >
          {{ formatSchemaType(props.node.component_schema.input_type) }}
        </div>
      </div>

      <div class="space-y-2">
        <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Output Schema
        </div>
        <div
          class="p-2.5 bg-muted/20 rounded-lg border border-border/50 text-xs text-muted-foreground font-mono break-all"
        >
          {{ formatSchemaType(props.node.component_schema.output_type) }}
        </div>
      </div>
    </div>
  </div>
</template>

