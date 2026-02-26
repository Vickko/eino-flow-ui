<script setup lang="ts">
defineProps<{
  status: string
  statusColor: string
  isRunning: boolean
  hasSelectedGraph: boolean
}>()

const emit = defineEmits<{
  run: []
  clear: []
}>()
</script>

<template>
  <div class="h-12 flex items-center justify-between px-4 bg-transparent shrink-0">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/20 border border-border/20">
        <h3 class="text-xs font-semibold text-foreground/80">Debug Console</h3>
      </div>
      <div class="flex items-center gap-2 px-2 py-1">
        <span class="w-1.5 h-1.5 rounded-full" :class="statusColor"></span>
        <span class="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{{
          status
        }}</span>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        :disabled="isRunning || !hasSelectedGraph"
        class="text-xs font-medium text-white bg-green-600/90 hover:bg-green-500 border border-green-500/30 hover:border-green-400 px-3 py-1.5 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95 shadow-[0_0_10px_rgba(34,197,94,0.15)]"
        @click="emit('run')"
      >
        <svg v-if="!isRunning" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
            clip-rule="evenodd"
          />
        </svg>
        <svg v-else class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Run
      </button>

      <button
        class="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted/20 border border-transparent hover:border-border/20 transition-all duration-200 active:scale-95"
        @click="emit('clear')"
      >
        Clear
      </button>
    </div>
  </div>
</template>
