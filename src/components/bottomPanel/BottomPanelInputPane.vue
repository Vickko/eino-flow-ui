<script setup lang="ts">
import type { CanvasNode } from '@/shared/types'

const props = defineProps<{
  inputJson: string
  selectedFromNode: string
  canvasNodes: CanvasNode[]
}>()

const emit = defineEmits<{
  'update:inputJson': [value: string]
  'update:selectedFromNode': [value: string]
  reset: []
}>()

const onInput = (e: Event): void => {
  emit('update:inputJson', (e.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <div class="w-1/2 flex flex-col rounded-lg border border-border/30 bg-muted/20 overflow-hidden">
    <div class="bg-muted/20 px-3 py-2 border-b border-border/10 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground font-mono font-medium">Input (JSON)</span>
        <button
          :disabled="!props.selectedFromNode"
          class="text-[10px] p-1 rounded bg-muted/40 hover:bg-muted border border-border/30 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
          title="重置为默认模板"
          @click="emit('reset')"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      <div class="flex items-center gap-2">
        <label class="text-[10px] text-muted-foreground font-medium">From Node:</label>
        <select
          :value="props.selectedFromNode"
          class="text-[10px] px-2 py-0.5 rounded bg-muted border border-border/30 text-foreground font-mono focus:outline-none focus:border-primary/50 transition-colors"
          :disabled="!props.canvasNodes.length"
          @change="emit('update:selectedFromNode', ($event.target as HTMLSelectElement).value)"
        >
          <option v-if="!props.canvasNodes.length" value="">--</option>
          <option v-for="node in props.canvasNodes" :key="node.key" :value="node.key">
            {{ node.key }} ({{ node.type }})
          </option>
        </select>
      </div>
    </div>

    <textarea
      :value="props.inputJson"
      class="flex-1 w-full p-3 font-mono text-xs text-foreground bg-transparent resize-none focus:outline-none focus:bg-muted/10 transition-colors placeholder:text-muted-foreground/40"
      placeholder='{ "key": "value" }'
      spellcheck="false"
      @input="onInput"
    ></textarea>
  </div>
</template>
