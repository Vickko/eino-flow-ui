<script setup>
import { computed } from 'vue';
import { useGraph } from '../composables/useGraph';

const { selectedNode } = useGraph();

const nodeTypeColor = computed(() => {
  const type = selectedNode.value?.type?.toLowerCase() || '';
  switch (type) {
    case 'start': return 'bg-emerald-500';
    case 'end': return 'bg-rose-500';
    case 'lambda': return 'bg-blue-500';
    case 'chain': return 'bg-purple-500';
    case 'chatmodel': return 'bg-indigo-500';
    case 'tool': return 'bg-amber-500';
    default: return 'bg-zinc-400';
  }
});

const formattedConfig = computed(() => {
  if (!selectedNode.value) return '{}';
  // Filter out some internal keys if needed
  const { component_schema, graph_schema, ...rest } = selectedNode.value;
  return JSON.stringify(rest, null, 2);
});
</script>

<template>
  <aside class="w-80 h-full rounded-xl border border-border bg-card/80 backdrop-blur-md flex flex-col shadow-xl overflow-hidden">
    <!-- Header -->
    <div class="h-14 border-b border-border/50 flex items-center justify-between px-4">
      <h2 class="font-semibold text-foreground">Inspector</h2>
      <div v-if="selectedNode" class="text-xs text-muted-foreground font-mono truncate max-w-[120px]">{{ selectedNode.key }}</div>
    </div>

    <!-- Empty State -->
    <div v-if="!selectedNode" class="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
      <svg class="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-sm">Select a node to view details</p>
    </div>

    <!-- Content -->
    <div v-else class="flex-1 overflow-y-auto p-4 space-y-6">
      
      <!-- Node Identity -->
      <div class="space-y-2">
        <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Node Type</div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full" :class="nodeTypeColor"></span>
          <span class="text-sm font-medium text-foreground">{{ selectedNode.type }}</span>
        </div>
      </div>

      <!-- Configuration -->
      <div class="space-y-2">
        <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Properties</div>
        <div class="p-3 bg-muted/30 rounded-md border border-border text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre">
{{ formattedConfig }}
        </div>
      </div>

      <!-- Schema Info -->
      <div v-if="selectedNode.component_schema" class="space-y-4">
        <div class="space-y-2">
          <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Input Schema</div>
          <div class="p-2 bg-muted/30 rounded border border-border text-xs text-muted-foreground font-mono break-all">
            {{ selectedNode.component_schema.input_type?.type || 'Any' }}
          </div>
        </div>
        
        <div class="space-y-2">
          <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Output Schema</div>
          <div class="p-2 bg-muted/30 rounded border border-border text-xs text-muted-foreground font-mono break-all">
            {{ selectedNode.component_schema.output_type?.type || 'Any' }}
          </div>
        </div>
      </div>

      <!-- Subgraph Info -->
      <div v-if="selectedNode.graph_schema" class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
        <div class="flex items-center gap-2 text-amber-600 mb-1">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span class="text-xs font-medium">Subgraph Available</span>
        </div>
        <p class="text-[10px] text-amber-600/80">This node contains a nested graph definition.</p>
      </div>

    </div>

    <!-- Footer Actions -->
    <div v-if="selectedNode?.graph_schema" class="p-4 border-t border-border bg-muted/20">
      <button class="w-full py-2 px-4 bg-card border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted hover:border-border transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2 active:scale-[0.98]">
        <span>View Subgraph</span>
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </aside>
</template>