<script setup>
import { ref, watch } from 'vue';
import { useGraph } from '../composables/useGraph';
import { createDebugThread, streamDebugRun } from '../api';

const { selectedGraphId } = useGraph();

const inputJson = ref('{\n  "query": "hello"\n}');
const logs = ref([]);
const isRunning = ref(false);
const status = ref('Ready');
const statusColor = ref('bg-green-500');

const appendLog = (message) => {
  logs.value.push({
    timestamp: new Date().toLocaleTimeString(),
    message: message
  });
};

const clearLogs = () => {
  logs.value = [];
  status.value = 'Ready';
  statusColor.value = 'bg-green-500';
};

const runDebug = async () => {
  if (!selectedGraphId.value) {
    appendLog('Error: No graph selected');
    return;
  }

  let parsedInput;
  try {
    parsedInput = JSON.parse(inputJson.value);
  } catch (e) {
    appendLog('Error: Invalid JSON input');
    return;
  }

  isRunning.value = true;
  status.value = 'Running...';
  statusColor.value = 'bg-amber-500 animate-pulse';
  logs.value = []; // Clear previous logs on new run
  appendLog('Starting debug session...');

  try {
    // 1. Create Thread
    appendLog('Creating debug thread...');
    const threadRes = await createDebugThread(selectedGraphId.value, parsedInput);
    
    if (threadRes.code !== 0) {
      throw new Error(threadRes.msg || 'Failed to create thread');
    }
    
    const threadId = threadRes.data.thread_id;
    appendLog(`Thread created: ${threadId}`);

    // 2. Stream Run
    appendLog('Streaming execution...');
    await streamDebugRun(selectedGraphId.value, threadId, parsedInput, (chunk) => {
      // Try to format chunk if it's JSON, otherwise just append
      try {
        // Sometimes chunks might be multiple JSON objects concatenated or partial
        // For simplicity, we just append the raw chunk text for now, 
        // or you could try to parse SSE events if the backend sends them that way.
        // Assuming raw text or line-delimited JSON for now based on typical stream implementations.
        appendLog(chunk);
      } catch (e) {
        appendLog(chunk);
      }
    });

    appendLog('Execution finished.');
    status.value = 'Completed';
    statusColor.value = 'bg-blue-500';

  } catch (err) {
    appendLog(`Error: ${err.message}`);
    status.value = 'Error';
    statusColor.value = 'bg-red-500';
  } finally {
    isRunning.value = false;
  }
};
</script>

<template>
  <div class="h-full rounded-xl border border-border bg-card/80 backdrop-blur-md flex flex-col shadow-lg overflow-hidden">
    <!-- Header / Toolbar -->
    <div class="h-10 border-b border-border/50 flex items-center justify-between px-4 bg-muted/30">
      <div class="flex items-center gap-4">
        <h3 class="text-sm font-semibold text-foreground">Debug Console</h3>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full" :class="statusColor"></span>
          <span class="text-xs text-muted-foreground">{{ status }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="runDebug"
          :disabled="isRunning || !selectedGraphId"
          class="text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-2 py-1 rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 active:scale-95"
        >
          <svg v-if="!isRunning" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>
          <svg v-else class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Run
        </button>
        <button
          @click="clearLogs"
          class="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-all duration-200 active:scale-95"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Input Area -->
      <div class="w-1/2 border-r border-border p-0 flex flex-col">
        <div class="bg-muted/30 px-3 py-1 border-b border-border text-xs text-muted-foreground font-mono">Input (JSON)</div>
        <textarea
          v-model="inputJson"
          class="flex-1 w-full p-3 font-mono text-xs text-foreground bg-card resize-none focus:outline-none focus:bg-primary/5 transition-colors"
          placeholder='{ "key": "value" }'
          spellcheck="false"
        ></textarea>
      </div>

      <!-- Output Area -->
      <div class="w-1/2 flex flex-col bg-zinc-950">
        <div class="bg-zinc-900 px-3 py-1 border-b border-zinc-800 text-xs text-zinc-400 font-mono flex justify-between">
          <span>Output / Logs</span>
          <span v-if="logs.length" class="text-[10px] opacity-60">{{ logs.length }} lines</span>
        </div>
        <div class="flex-1 p-3 font-mono text-xs text-zinc-300 overflow-y-auto space-y-1">
          <div v-if="logs.length === 0" class="opacity-30 italic">Waiting for execution...</div>
          <div v-for="(log, index) in logs" :key="index" class="flex gap-2 hover:bg-white/5 rounded px-1 -mx-1">
            <span class="text-zinc-500 shrink-0 select-none">[{{ log.timestamp }}]</span>
            <span class="break-all whitespace-pre-wrap">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>