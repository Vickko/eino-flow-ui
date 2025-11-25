<script setup>
import { ref, watch } from 'vue';
import { useGraph } from '../composables/useGraph';
import { createDebugThread, streamDebugRun, fetchGraphCanvas } from '../api';

const { selectedGraphId } = useGraph();

const inputJson = ref('{\n  "query": "hello"\n}');
const logs = ref([]);
const isRunning = ref(false);
const status = ref('Ready');
const statusColor = ref('bg-green-500');
const canvasNodes = ref([]);
const selectedFromNode = ref('');

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

// 加载图的 canvas 数据以获取节点列表
const loadCanvasNodes = async (graphId) => {
  if (!graphId) {
    canvasNodes.value = [];
    selectedFromNode.value = '';
    return;
  }

  try {
    const data = await fetchGraphCanvas(graphId);
    if (data.code === 0 && data.data.canvas_info) {
      const canvas = data.data.canvas_info;
      canvasNodes.value = canvas.nodes || [];

      // 自动选择起始节点（type 为 "start" 的节点）
      const startNode = canvasNodes.value.find(node => node.type === 'start');
      selectedFromNode.value = startNode ? startNode.key : (canvasNodes.value[0]?.key || '');
    }
  } catch (err) {
    console.error('Failed to load canvas nodes:', err);
    canvasNodes.value = [];
    selectedFromNode.value = '';
  }
};

// 监听图选择变化
watch(selectedGraphId, (newId) => {
  loadCanvasNodes(newId);
}, { immediate: true });

const runDebug = async () => {
  if (!selectedGraphId.value) {
    appendLog('Error: No graph selected');
    return;
  }

  if (!selectedFromNode.value) {
    appendLog('Error: No start node found. Please wait for canvas to load.');
    return;
  }

  // 验证 JSON 输入
  try {
    JSON.parse(inputJson.value);
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
    const threadRes = await createDebugThread(selectedGraphId.value, {});

    if (threadRes.code !== 0) {
      throw new Error(threadRes.msg || 'Failed to create thread');
    }

    const threadId = threadRes.data.thread_id;
    appendLog(`Thread created: ${threadId}`);

    // 2. 构建符合 API 文档的 DebugRunRequest
    const debugRequest = {
      from_node: selectedFromNode.value,
      input: inputJson.value, // 保持为 JSON 字符串
      log_id: `debug-${Date.now()}` // 生成一个唯一的 log_id
    };

    appendLog(`Starting from node: ${selectedFromNode.value}`);
    appendLog('Streaming execution...');

    // 3. Stream Run
    await streamDebugRun(selectedGraphId.value, threadId, debugRequest, (chunk) => {
      // 直接追加 SSE 数据块
      appendLog(chunk);
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
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header / Toolbar -->
    <div class="h-12 flex items-center justify-between px-4 bg-transparent shrink-0">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/20 border border-border/20">
          <h3 class="text-xs font-semibold text-foreground/80">Debug Console</h3>
        </div>
        <div class="flex items-center gap-2 px-2 py-1">
          <span class="w-1.5 h-1.5 rounded-full" :class="statusColor"></span>
          <span class="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{{ status }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="runDebug"
          :disabled="isRunning || !selectedGraphId"
          class="text-xs font-medium text-white bg-green-600/90 hover:bg-green-500 border border-green-500/30 hover:border-green-400 px-3 py-1.5 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95 shadow-[0_0_10px_rgba(34,197,94,0.15)]"
        >
          <svg v-if="!isRunning" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>
          <svg v-else class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Run
        </button>
        <button
          @click="clearLogs"
          class="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted/20 border border-transparent hover:border-border/20 transition-all duration-200 active:scale-95"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 flex overflow-hidden px-2 pb-2 pt-0 gap-2">
      <!-- Input Area -->
      <div class="w-1/2 flex flex-col rounded-lg border border-border/30 bg-muted/20 overflow-hidden">
        <div class="bg-muted/20 px-3 py-2 border-b border-border/10 flex items-center justify-between">
          <span class="text-xs text-muted-foreground font-mono font-medium">Input (JSON)</span>
          <!-- Node Selector -->
          <div class="flex items-center gap-2">
            <label class="text-[10px] text-muted-foreground font-medium">From Node:</label>
            <select
              v-model="selectedFromNode"
              class="text-[10px] px-2 py-0.5 rounded bg-muted border border-border/30 text-foreground font-mono focus:outline-none focus:border-primary/50 transition-colors"
              :disabled="!canvasNodes.length"
            >
              <option v-if="!canvasNodes.length" value="">--</option>
              <option
                v-for="node in canvasNodes"
                :key="node.key"
                :value="node.key"
              >
                {{ node.key }} ({{ node.type }})
              </option>
            </select>
          </div>
        </div>
        <textarea
          v-model="inputJson"
          class="flex-1 w-full p-3 font-mono text-xs text-foreground bg-transparent resize-none focus:outline-none focus:bg-muted/10 transition-colors placeholder:text-muted-foreground/40"
          placeholder='{ "key": "value" }'
          spellcheck="false"
        ></textarea>
      </div>

      <!-- Output Area -->
      <div class="w-1/2 flex flex-col rounded-lg border border-border/30 bg-muted/20 overflow-hidden">
        <div class="bg-muted/20 px-3 py-2 border-b border-border/10 text-xs text-muted-foreground font-mono font-medium flex justify-between items-center">
          <span>Output / Logs</span>
          <span v-if="logs.length" class="text-[10px] opacity-60 bg-muted/30 px-1.5 py-0.5 rounded-full">{{ logs.length }}</span>
        </div>
        <div class="flex-1 p-3 font-mono text-xs text-muted-foreground overflow-y-auto space-y-1">
          <div v-if="logs.length === 0" class="text-muted-foreground/50 italic px-1">Waiting for execution...</div>
          <div v-for="(log, index) in logs" :key="index" class="flex gap-2 hover:bg-muted/10 rounded px-2 py-0.5 -mx-1 transition-colors">
            <span class="text-muted-foreground/60 shrink-0 select-none">[{{ log.timestamp }}]</span>
            <span class="break-all whitespace-pre-wrap">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>