<script setup>
import { computed, ref } from 'vue';
import { useGraph } from '../composables/useGraph';

const { selectedNode, nodeExecutionResults } = useGraph();

const activeTab = ref('config');

const executionResult = computed(() => {
  if (!selectedNode.value) return null;
  const result = nodeExecutionResults.value[selectedNode.value.key];
  return result;
});

const formattedInput = computed(() => {
  if (!executionResult.value?.input) return '';
  try {
    // 如果已经是对象，直接格式化；如果是字符串，先解析再格式化
    const input = typeof executionResult.value.input === 'string'
      ? JSON.parse(executionResult.value.input)
      : executionResult.value.input;
    return JSON.stringify(input, null, 2);
  } catch (e) {
    // 如果解析失败，直接返回原始值
    return executionResult.value.input;
  }
});

const formattedOutput = computed(() => {
  if (!executionResult.value?.output) return '';
  try {
    // 如果已经是对象，直接格式化；如果是字符串，先解析再格式化
    const output = typeof executionResult.value.output === 'string'
      ? JSON.parse(executionResult.value.output)
      : executionResult.value.output;
    return JSON.stringify(output, null, 2);
  } catch (e) {
    // 如果解析失败，直接返回原始值
    return executionResult.value.output;
  }
});

const parsedError = computed(() => {
  if (!executionResult.value?.error) return null;
  try {
    const err = typeof executionResult.value.error === 'string'
      ? JSON.parse(executionResult.value.error)
      : executionResult.value.error;
    return (typeof err === 'object' && err !== null) ? err : null;
  } catch (e) {
    return null;
  }
});

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
  <aside class="w-80 h-full rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl flex flex-col shadow-panel overflow-hidden">
      <!-- Header -->
      <div class="h-14 border-b border-border/40 flex items-center justify-between px-4 bg-muted/10">
        <h2 class="font-semibold text-sm tracking-tight text-foreground">Inspector</h2>
        <div v-if="selectedNode" class="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono truncate max-w-[120px] border border-primary/20">{{ selectedNode.key }}</div>
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
      <div class="space-y-3">
        <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Node Type</div>
        <div class="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
          <span class="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]" :class="nodeTypeColor"></span>
          <span class="text-sm font-medium text-foreground">{{ selectedNode.type }}</span>
        </div>
      </div>

      <!-- Tab Switcher -->
      <div class="flex p-1 bg-muted/20 rounded-lg border border-border/50">
        <button
          @click="activeTab = 'config'"
          :class="['flex-1 text-xs font-medium py-1.5 rounded-md transition-all', activeTab === 'config' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground']"
        >
          Config
        </button>
        <button
          @click="activeTab = 'trace'"
          :class="['flex-1 text-xs font-medium py-1.5 rounded-md transition-all', activeTab === 'trace' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground']"
        >
          Trace
        </button>
      </div>

      <!-- Config Tab -->
      <div v-if="activeTab === 'config'" class="space-y-6">
        <!-- Configuration -->
        <div class="space-y-3">
          <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Properties</div>
          <div class="p-3 bg-muted/20 rounded-lg border border-border/50 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre custom-scrollbar">
  {{ formattedConfig }}
          </div>
        </div>

        <!-- Schema Info -->
        <div v-if="selectedNode.component_schema" class="space-y-4">
          <div class="space-y-2">
            <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Input Schema</div>
            <div class="p-2.5 bg-muted/20 rounded-lg border border-border/50 text-xs text-muted-foreground font-mono break-all">
              {{ selectedNode.component_schema.input_type?.type || 'Any' }}
            </div>
          </div>
          
          <div class="space-y-2">
            <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Output Schema</div>
            <div class="p-2.5 bg-muted/20 rounded-lg border border-border/50 text-xs text-muted-foreground font-mono break-all">
              {{ selectedNode.component_schema.output_type?.type || 'Any' }}
            </div>
          </div>
        </div>

        <!-- Subgraph Info -->
        <div v-if="selectedNode.graph_schema" class="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg backdrop-blur-sm">
          <div class="flex items-center gap-2 text-amber-500 mb-1">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span class="text-xs font-medium">Subgraph Available</span>
          </div>
          <p class="text-[10px] text-amber-500/80">This node contains a nested graph definition.</p>
        </div>
      </div>

      <!-- Trace Tab -->
      <div v-else-if="activeTab === 'trace'" class="space-y-4">
        <div v-if="!executionResult" class="text-center py-8 text-muted-foreground">
          <svg class="w-8 h-8 mx-auto mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-xs">No execution data available.</p>
          <p class="text-[10px] opacity-70 mt-1">Run the graph to see trace details.</p>
        </div>
        <div v-else class="space-y-4">
          <!-- Status & Metrics -->
          <div class="grid grid-cols-2 gap-2">
            <div class="p-2 bg-muted/20 rounded border border-border/50">
              <div class="text-[10px] text-muted-foreground uppercase">Status</div>
              <div class="text-xs font-medium capitalize" :class="executionResult.status === 'error' ? 'text-red-500' : 'text-green-500'">{{ executionResult.status }}</div>
            </div>
            <div class="p-2 bg-muted/20 rounded border border-border/50">
              <div class="text-[10px] text-muted-foreground uppercase">Duration</div>
              <div class="text-xs font-medium">{{ executionResult.metrics?.duration || 0 }}ms</div>
            </div>
          </div>

          <!-- Input -->
          <div class="space-y-2">
            <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Input</div>
            <div class="p-2 bg-muted/20 rounded-lg border border-border/50 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre custom-scrollbar">{{ formattedInput }}</div>
          </div>

          <!-- Output -->
          <div class="space-y-2">
            <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Output</div>
            <div class="p-2 bg-muted/20 rounded-lg border border-border/50 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre custom-scrollbar">{{ formattedOutput }}</div>
          </div>

          <!-- Error -->
          <div v-if="executionResult.error" class="space-y-3">
            <template v-if="parsedError">
              <div class="text-[10px] font-semibold text-red-500 uppercase tracking-wider">Error Details</div>
              
              <!-- Surface View: Key-Value List -->
              <div class="bg-red-500/5 rounded-lg border border-red-500/20 overflow-hidden">
                <div v-for="(value, key) in parsedError" :key="key" class="flex border-b border-red-500/10 last:border-0">
                  <div class="w-1/3 p-2 border-r border-red-500/10 bg-red-500/10 text-[10px] font-medium text-red-600 truncate" :title="key">
                    {{ key }}
                  </div>
                  <div class="w-2/3 p-2 text-xs font-mono text-red-600/90 break-all">
                    {{ typeof value === 'object' ? JSON.stringify(value) : value }}
                  </div>
                </div>
              </div>

              <!-- Deep View: Raw JSON -->
              <div class="space-y-1">
                <div class="text-[10px] font-semibold text-red-500/70 uppercase tracking-wider">Raw Data</div>
                <div class="p-2 bg-red-500/5 rounded-lg border border-red-500/20 text-xs text-red-500 font-mono overflow-x-auto whitespace-pre custom-scrollbar">
                  {{ JSON.stringify(parsedError, null, 2) }}
                </div>
              </div>
            </template>

            <template v-else>
              <div class="text-[10px] font-semibold text-red-500 uppercase tracking-wider">Error</div>
              <div class="p-2 bg-red-500/10 rounded-lg border border-red-500/20 text-xs text-red-500 font-mono break-all">{{ executionResult.error }}</div>
            </template>
          </div>
        </div>
      </div>

    </div>

    <!-- Footer Actions -->
    <div v-if="selectedNode?.graph_schema" class="p-4 border-t border-border/40 bg-muted/10 backdrop-blur-sm">
      <button class="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98]">
        <span>View Subgraph</span>
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </aside>
</template>