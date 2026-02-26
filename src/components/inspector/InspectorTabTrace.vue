<script setup lang="ts">
import { computed } from 'vue'
import type { JsonValue, NodeExecutionResult } from '@/shared/types'

const props = defineProps<{
  executionResult: NodeExecutionResult | null
}>()

const formatJsonBlock = (value: JsonValue | undefined): string => {
  if (value === undefined || value === null) return ''

  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const formattedInput = computed((): string => formatJsonBlock(props.executionResult?.input))
const formattedOutput = computed((): string => formatJsonBlock(props.executionResult?.output))

const parsedError = computed((): Record<string, unknown> | null => {
  const raw = props.executionResult?.error
  if (!raw) return null

  const value = (() => {
    if (typeof raw !== 'string') return raw
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  })()

  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
})

const formattedStartTime = computed((): string => {
  const ts = props.executionResult?.timestamp
  if (!ts) return '-'
  return new Date(ts).toLocaleTimeString()
})
</script>

<template>
  <div class="space-y-4">
    <div v-if="!props.executionResult" class="text-center py-8 text-muted-foreground">
      <svg class="w-8 h-8 mx-auto mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="text-xs">No execution data available.</p>
      <p class="text-[10px] opacity-70 mt-1">Run the graph to see trace details.</p>
    </div>

    <div v-else class="space-y-4">
      <div class="space-y-2">
        <div class="p-2 bg-muted/20 rounded border border-border/50 flex items-center justify-between">
          <div class="text-[10px] text-muted-foreground uppercase">Status</div>
          <div class="flex items-center gap-2">
            <div
              class="w-2 h-2 rounded-full transition-colors duration-300"
              :class="
                props.executionResult.status === 'error'
                  ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                  : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
              "
            ></div>
            <div class="text-xs font-medium capitalize text-foreground">
              {{ props.executionResult.status }}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="p-2 bg-muted/20 rounded border border-border/50">
            <div class="text-[10px] text-muted-foreground uppercase">Start Time</div>
            <div class="text-xs font-medium">{{ formattedStartTime }}</div>
          </div>
          <div class="p-2 bg-muted/20 rounded border border-border/50">
            <div class="text-[10px] text-muted-foreground uppercase">Duration</div>
            <div class="text-xs font-medium">
              {{ props.executionResult.metrics?.duration ?? 0 }}ms
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Input
        </div>
        <div
          class="p-2 bg-muted/20 rounded-lg border border-border/50 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre custom-scrollbar"
        >
          {{ formattedInput }}
        </div>
      </div>

      <div class="space-y-2">
        <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Output
        </div>
        <div
          class="p-2 bg-muted/20 rounded-lg border border-border/50 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre custom-scrollbar"
        >
          {{ formattedOutput }}
        </div>
      </div>

      <div v-if="props.executionResult.error" class="space-y-3">
        <template v-if="parsedError">
          <div class="text-[10px] font-semibold text-red-500 uppercase tracking-wider">
            Error Details
          </div>

          <div class="bg-red-500/5 rounded-lg border border-red-500/20 overflow-hidden">
            <div
              v-for="(value, key) in parsedError"
              :key="key"
              class="flex border-b border-red-500/10 last:border-0"
            >
              <div
                class="w-1/3 p-2 border-r border-red-500/10 bg-red-500/10 text-[10px] font-medium text-red-600 truncate"
                :title="key"
              >
                {{ key }}
              </div>
              <div class="w-2/3 p-2 text-xs font-mono text-red-600/90 break-all">
                {{ typeof value === 'object' ? JSON.stringify(value) : value }}
              </div>
            </div>
          </div>

          <div class="space-y-1">
            <div class="text-[10px] font-semibold text-red-500/70 uppercase tracking-wider">
              Raw Data
            </div>
            <div
              class="p-2 bg-red-500/5 rounded-lg border border-red-500/20 text-xs text-red-500 font-mono overflow-x-auto whitespace-pre custom-scrollbar"
            >
              {{ JSON.stringify(parsedError, null, 2) }}
            </div>
          </div>
        </template>

        <template v-else>
          <div class="text-[10px] font-semibold text-red-500 uppercase tracking-wider">Error</div>
          <div
            class="p-2 bg-red-500/10 rounded-lg border border-red-500/20 text-xs text-red-500 font-mono break-all"
          >
            {{ props.executionResult.error }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
