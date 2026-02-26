<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { LogEntry } from '@/shared/types'

const props = defineProps<{
  logs: LogEntry[]
  setContainer: (el: HTMLElement | null) => void
}>()

const emit = defineEmits<{
  copy: []
}>()

const onContainerRef = (el: Element | ComponentPublicInstance | null): void => {
  props.setContainer(el instanceof HTMLElement ? el : null)
}
</script>

<template>
  <div class="w-1/2 flex flex-col rounded-lg border border-border/30 bg-muted/20 overflow-hidden">
    <div
      class="bg-muted/20 px-3 py-2 border-b border-border/10 text-xs text-muted-foreground font-mono font-medium flex justify-between items-center"
    >
      <span>Output / Logs</span>
      <div class="flex items-center gap-2">
        <span
          v-if="props.logs.length"
          class="text-[10px] opacity-60 bg-muted/30 px-1.5 py-0.5 rounded-full"
          >{{ props.logs.length }}</span
        >
        <button
          :disabled="props.logs.length === 0"
          class="p-1 rounded bg-muted/40 hover:bg-muted border border-border/30 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
          title="复制日志"
          @click="emit('copy')"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>
    </div>
    <div
      :ref="onContainerRef"
      class="flex-1 p-3 font-mono text-xs text-muted-foreground overflow-y-auto space-y-1"
    >
      <div v-if="props.logs.length === 0" class="text-muted-foreground/50 italic px-1">
        Waiting for execution...
      </div>
      <div
        v-for="(log, index) in props.logs"
        :key="index"
        class="flex gap-2 hover:bg-muted/10 rounded px-2 py-0.5 -mx-1 transition-colors"
      >
        <span class="text-muted-foreground/60 shrink-0 select-none">[{{ log.timestamp }}]</span>
        <span class="break-all whitespace-pre-wrap">{{ log.message }}</span>
      </div>
    </div>
  </div>
</template>
