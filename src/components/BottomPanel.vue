<script setup>
import { ref, watch, nextTick } from 'vue';
import { useGraph } from '../composables/useGraph';
import { createDebugThread, streamDebugRun, fetchGraphCanvas } from '../api';

const { selectedGraphId, selectedNode, setSelectedNode, setNodeExecutionResult, clearExecutionResults } = useGraph();

const inputJson = ref('{\n  "query": "hello"\n}');
const logs = ref([]);
const isRunning = ref(false);
const status = ref('Ready');
const statusColor = ref('bg-green-500');
const canvasNodes = ref([]);
const selectedFromNode = ref('');
const logsContainer = ref(null);
const typewriteQueue = ref([]);
const isTyping = ref(false);
const isInternalUpdate = ref(false); // 标志位：是否为内部自动更新

const scrollToBottom = () => {
  nextTick(() => {
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
    }
  });
};

const typewriteLog = (logEntry) => {
  return new Promise((resolve) => {
    let cursor = 0;
    const totalLength = logEntry.fullMessage.length;
    // "Very fast" effect: process multiple characters per frame
    const charsPerFrame = 20;

    const type = () => {
      if (cursor < totalLength) {
        const nextCursor = Math.min(cursor + charsPerFrame, totalLength);
        logEntry.message += logEntry.fullMessage.substring(cursor, nextCursor);
        cursor = nextCursor;

        scrollToBottom();

        if (cursor < totalLength) {
          requestAnimationFrame(type);
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    };

    requestAnimationFrame(type);
  });
};

const processTypewriteQueue = async () => {
  if (isTyping.value || typewriteQueue.value.length === 0) {
    return;
  }

  isTyping.value = true;

  while (typewriteQueue.value.length > 0) {
    const logEntry = typewriteQueue.value.shift();
    await typewriteLog(logEntry);
  }

  isTyping.value = false;
};

const appendLog = (message) => {
  const logEntry = {
    timestamp: new Date().toLocaleTimeString(),
    fullMessage: message,
    message: ''
  };
  logs.value.push(logEntry);
  typewriteQueue.value.push(logEntry);
  processTypewriteQueue();
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

// 根据 JsonSchema 生成示例 JSON
const generateSampleJson = (schema) => {
  if (!schema) return '{}';

  const generate = (s) => {
    if (!s) return null;

    // 处理 anyOf，选择第一个可用的 schema
    if (s.anyOf && s.anyOf.length > 0) {
      return generate(s.anyOf[0]);
    }

    // 如果没有明确的 type，但有 properties，假定为 object
    if (!s.type && s.properties) {
      s.type = 'object';
    }

    if (!s.type) return null;

    switch (s.type) {
      case 'string':
        if (s.enum && s.enum.length > 0) {
          return s.enum[0];
        }
        return s.default !== undefined ? s.default : '';

      case 'number':
        return s.default !== undefined ? s.default : 0;

      case 'boolean':
        return s.default !== undefined ? s.default : false;

      case 'array':
        if (s.items) {
          const item = generate(s.items);
          return item !== null ? [item] : [];
        }
        return [];

      case 'object':
        if (s.properties) {
          const obj = {};
          // 按 propertyOrder 排序（如果有）
          const keys = s.propertyOrder || Object.keys(s.properties);
          keys.forEach(key => {
            if (s.properties[key]) {
              const value = generate(s.properties[key]);
              if (value !== null) {
                obj[key] = value;
              }
            }
          });
          return obj;
        }
        if (s.additionalProperties) {
          // 如果只有 additionalProperties，返回一个示例键值对
          return { key: generate(s.additionalProperties) };
        }
        return {};

      case 'interface':
        // interface 类型通常代表复杂对象
        if (s.properties) {
          const obj = {};
          const keys = s.propertyOrder || Object.keys(s.properties);
          keys.forEach(key => {
            if (s.properties[key]) {
              const value = generate(s.properties[key]);
              if (value !== null) {
                obj[key] = value;
              }
            }
          });
          return obj;
        }
        return {};

      case 'null':
        return null;

      default:
        return null;
    }
  };

  const sampleData = generate(schema);
  return JSON.stringify(sampleData, null, 2);
};

// 根据选中的节点更新输入模板
const updateInputTemplate = () => {
  if (!selectedFromNode.value || !canvasNodes.value.length) {
    return;
  }

  const node = canvasNodes.value.find(n => n.key === selectedFromNode.value);
  if (!node) {
    return;
  }

  // 优先使用 component_schema 的 input_type
  let inputType = null;
  if (node.component_schema && node.component_schema.input_type) {
    inputType = node.component_schema.input_type;
  } else if (node.graph_schema && node.graph_schema.input_type) {
    // 如果是子图，使用 graph_schema 的 input_type
    inputType = node.graph_schema.input_type;
  }

  if (inputType) {
    inputJson.value = generateSampleJson(inputType);
  }
};

// 监听图选择变化
watch(selectedGraphId, (newId) => {
  loadCanvasNodes(newId);
}, { immediate: true });

// 监听图中节点选择变化，更新 from node
watch(selectedNode, (newNode) => {
  // 如果是内部自动更新，跳过
  if (isInternalUpdate.value) {
    return;
  }

  if (newNode && newNode.key && canvasNodes.value.length > 0) {
    // 只在节点存在于 canvasNodes 中且与当前值不同时更新
    const nodeExists = canvasNodes.value.find(n => n.key === newNode.key);
    if (nodeExists && selectedFromNode.value !== newNode.key) {
      isInternalUpdate.value = true;
      selectedFromNode.value = newNode.key;
      // 使用 queueMicrotask 确保在同步代码执行完后重置
      queueMicrotask(() => {
        isInternalUpdate.value = false;
      });
    }
  }
});

// 监听 from node 选择变化，更新输入模板并联动图节点选择
watch(selectedFromNode, () => {
  // 总是更新输入模板
  updateInputTemplate();

  // 如果是内部自动更新，跳过图节点联动
  if (isInternalUpdate.value) {
    return;
  }

  // 同时更新 selectedNode 以联动 Inspector 和图
  if (selectedFromNode.value && canvasNodes.value.length > 0) {
    const node = canvasNodes.value.find(n => n.key === selectedFromNode.value);
    // 只在节点不同时更新，避免循环
    if (node && (!selectedNode.value || selectedNode.value.key !== node.key)) {
      isInternalUpdate.value = true;
      setSelectedNode(node);
      // 使用 queueMicrotask 确保在同步代码执行完后重置
      queueMicrotask(() => {
        isInternalUpdate.value = false;
      });
    }
  }
});

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
  clearExecutionResults(); // Clear previous execution results
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
    let sseBuffer = ''; // 用于累积 SSE 数据
    await streamDebugRun(selectedGraphId.value, threadId, debugRequest, (chunk) => {
      // 直接追加 SSE 数据块
      appendLog(chunk);

      // 累积数据到缓冲区
      sseBuffer += chunk;

      // 按 SSE 事件分割（事件之间用双换行符分隔）
      const events = sseBuffer.split('\n\n');

      // 保留最后一个不完整的事件在缓冲区中
      sseBuffer = events.pop() || '';

      // 处理每个完整的 SSE 事件
      for (const event of events) {
        if (!event.trim()) continue;

        // 提取 data 行
        const lines = event.split('\n');
        let dataContent = '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            dataContent += line.substring(6);
          } else if (line.startsWith('data:')) {
            dataContent += line.substring(5);
          } else if (dataContent && line.startsWith(':')) {
            // 继续前一行的 data
            dataContent += line.substring(1);
          }
        }

        if (!dataContent) continue;

        try {
          const data = JSON.parse(dataContent);

          // 检查是否包含节点执行信息
          // 数据结构：{ type: 'data', content: { node_key, input, output, metrics } }
          if (data.type === 'data' && data.content && data.content.node_key) {
            const nodeData = data.content;

            // 解析 input、output 和 error（它们可能是 JSON 字符串）
            let parsedInput = nodeData.input;
            let parsedOutput = nodeData.output;
            let parsedError = nodeData.error;

            try {
              if (typeof nodeData.input === 'string') {
                parsedInput = JSON.parse(nodeData.input);
              }
            } catch (e) {
              // 解析失败，保留原始值
            }

            try {
              if (typeof nodeData.output === 'string') {
                parsedOutput = JSON.parse(nodeData.output);
              }
            } catch (e) {
              // 解析失败，保留原始值
            }

            try {
              if (typeof nodeData.error === 'string') {
                parsedError = JSON.parse(nodeData.error);
              }
            } catch (e) {
              // 解析失败，保留原始字符串
            }

            setNodeExecutionResult(nodeData.node_key, {
              status: nodeData.status || (nodeData.error ? 'error' : 'success'),
              input: parsedInput,
              output: parsedOutput,
              error: parsedError,
              metrics: nodeData.metrics || {},
              timestamp: new Date().toISOString()
            });
          }
        } catch (e) {
          // 忽略 SSE 解析错误
        }
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
        <div ref="logsContainer" class="flex-1 p-3 font-mono text-xs text-muted-foreground overflow-y-auto space-y-1">
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