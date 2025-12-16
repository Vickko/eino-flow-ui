<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGraph } from '../composables/useGraph'
import { Settings2, Activity, MessageSquare } from 'lucide-vue-next'
import { formatSchemaType } from '@/utils/schema'
import type { Message } from '../composables/useChat'
import MessageBubble from './chat/MessageBubble.vue'

const { selectedNode, nodeExecutionResults, navigateToSubgraph } = useGraph()

const handleViewSubgraph = (): void => {
  if (selectedNode.value?.graph_schema) {
    navigateToSubgraph(selectedNode.value.graph_schema)
  }
}

const activeTab = ref<'config' | 'trace' | 'chat'>('config')
const playChatAnimation = ref(false)
const playTraceAnimation = ref(false)

// 监听 tab 切换，当切换到 chat/trace tab 时播放动画
watch(activeTab, (newTab, oldTab) => {
  if (newTab === 'chat' && oldTab !== 'chat') {
    playChatAnimation.value = true
    setTimeout(() => {
      playChatAnimation.value = false
    }, 500) // 动画持续时间
  }

  if (newTab === 'trace' && oldTab !== 'trace') {
    playTraceAnimation.value = true
    setTimeout(() => {
      playTraceAnimation.value = false
    }, 200) // 动画持续时间
  }
})

const executionResult = computed(() => {
  if (!selectedNode.value) return null
  return nodeExecutionResults.value[selectedNode.value.key] ?? null
})

const formattedInput = computed((): string => {
  if (!executionResult.value?.input) return ''
  try {
    const input =
      typeof executionResult.value.input === 'string'
        ? JSON.parse(executionResult.value.input)
        : executionResult.value.input
    return JSON.stringify(input, null, 2)
  } catch {
    return String(executionResult.value.input)
  }
})

const formattedOutput = computed((): string => {
  if (!executionResult.value?.output) return ''
  try {
    const output =
      typeof executionResult.value.output === 'string'
        ? JSON.parse(executionResult.value.output)
        : executionResult.value.output
    return JSON.stringify(output, null, 2)
  } catch {
    return String(executionResult.value.output)
  }
})

const parsedError = computed((): Record<string, unknown> | null => {
  if (!executionResult.value?.error) return null
  try {
    const err =
      typeof executionResult.value.error === 'string'
        ? JSON.parse(executionResult.value.error)
        : executionResult.value.error
    return typeof err === 'object' && err !== null
      ? (err as Record<string, unknown>)
      : null
  } catch {
    return null
  }
})

const nodeTypeColor = computed((): string => {
  if (selectedNode.value?.graph_schema) {
    return 'bg-amber-500'
  }

  const type = selectedNode.value?.type?.toLowerCase() ?? ''
  switch (type) {
    case 'start':
      return 'bg-emerald-500'
    case 'end':
      return 'bg-rose-500'
    case 'lambda':
      return 'bg-blue-500'
    case 'chain':
      return 'bg-purple-500'
    case 'chatmodel':
      return 'bg-indigo-500'
    case 'tool':
      return 'bg-amber-500'
    default:
      return 'bg-zinc-400'
  }
})

const formattedConfig = computed((): string => {
  if (!selectedNode.value) return '{}'
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { component_schema, graph_schema, ...rest } = selectedNode.value
  return JSON.stringify(rest, null, 2)
})

const formattedStartTime = computed((): string => {
  if (!executionResult.value?.timestamp) return '-'
  return new Date(executionResult.value.timestamp).toLocaleTimeString()
})

// 判断是否应该显示 chat tab
const shouldShowChatTab = computed(() => {
  if (!selectedNode.value?.component_schema) return false

  const inputType = selectedNode.value.component_schema.input_type
  const outputType = selectedNode.value.component_schema.output_type

  // 检查 input 是否是 Message 数组
  // 实际数据中类型信息存储在 title 字段，格式如 "[]*schema.Message"
  const isInputMessageArray =
    inputType?.type === 'array' &&
    (inputType?.title?.includes('Message') || inputType?.items?.title?.includes('Message'))

  // 检查 output 是否是 Message 指针
  // 格式如 "*schema.Message"
  const isOutputMessage =
    outputType?.title?.includes('Message') ||
    outputType?.goDefinition?.typeName?.includes('Message')

  return isInputMessageArray && isOutputMessage
})

// 合并 input 和 output 成 Message 数组
const chatMessages = computed((): Message[] => {
  if (!executionResult.value || !shouldShowChatTab.value) return []

  const messages: Message[] = []

  // 解析 input（数组）
  try {
    const input = typeof executionResult.value.input === 'string'
      ? JSON.parse(executionResult.value.input)
      : executionResult.value.input

    if (Array.isArray(input)) {
      input.forEach((msg: any, index: number) => {
        messages.push({
          id: `input-${index}`,
          conversationId: selectedNode.value?.key || 'unknown',
          role: msg.role || 'user',
          content: msg.content || '',
          timestamp: 0, // 不使用时间戳
          status: 'sent',
          model: msg.name || undefined
        })
      })
    }
  } catch (error) {
    console.error('Failed to parse input messages:', error)
  }

  // 解析 output（单个对象），添加到末尾
  try {
    const output = typeof executionResult.value.output === 'string'
      ? JSON.parse(executionResult.value.output)
      : executionResult.value.output

    if (output && typeof output === 'object') {
      messages.push({
        id: 'output-0',
        conversationId: selectedNode.value?.key || 'unknown',
        role: output.role || 'assistant',
        content: output.content || '',
        timestamp: 0, // 不使用时间戳
        status: 'sent',
        model: output.name || undefined
      })
    }
  } catch (error) {
    console.error('Failed to parse output message:', error)
  }

  return messages
})
</script>

<template>
  <aside class="w-80 h-full rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl flex flex-col shadow-panel overflow-hidden">
      <!-- Header -->
      <div class="h-14 border-b border-border/40 flex items-center justify-between px-4 bg-muted/10">
        <h2 class="font-semibold text-sm tracking-tight text-foreground">Inspector</h2>

        <!-- Toggle Switcher -->
        <div
          v-if="selectedNode"
          class="relative flex items-center bg-muted/20 rounded-lg p-1 border border-border/50 h-8 cursor-pointer"
          :class="shouldShowChatTab ? 'w-28' : 'w-20'"
        >
          <!-- Sliding Background -->
          <div
            class="absolute top-1 bottom-1 rounded-md bg-background shadow-sm transition-all duration-300 ease-in-out"
            :class="
              shouldShowChatTab
                ? activeTab === 'config'
                  ? 'left-1 w-[calc(33.333%-4px)]'
                  : activeTab === 'trace'
                  ? 'left-[33.333%] w-[calc(33.333%-4px)]'
                  : 'left-[66.666%] w-[calc(33.333%-4px)]'
                : activeTab === 'config'
                ? 'left-1 w-[calc(50%-4px)]'
                : 'left-[50%] w-[calc(50%-4px)]'
            "
          ></div>

          <!-- Buttons -->
          <div
            class="relative z-10 flex-1 flex items-center justify-center h-full transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            :class="activeTab === 'config' ? 'text-foreground' : 'text-muted-foreground'"
            title="Configuration"
            @click="activeTab = 'config'"
          >
            <Settings2 class="w-4 h-4 transition-transform duration-200" :class="activeTab === 'config' ? 'rotate-90' : ''" />
          </div>
          <div
            class="relative z-10 flex-1 flex items-center justify-center h-full transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            :class="activeTab === 'trace' ? 'text-foreground' : 'text-muted-foreground'"
            title="Trace & Logs"
            @click="activeTab = 'trace'"
          >
            <div v-if="activeTab === 'trace'" class="ecg-wrapper">
              <div class="ecg-container" :class="{ 'ecg-scroll': playTraceAnimation }">
                <Activity class="w-4 h-4 ecg-wave" />
                <Activity class="w-4 h-4 ecg-wave" />
              </div>
            </div>
            <Activity v-else class="w-4 h-4 transition-transform duration-200" />
          </div>
          <div
            v-if="shouldShowChatTab"
            class="relative z-10 flex-1 flex items-center justify-center h-full transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            :class="activeTab === 'chat' ? 'text-foreground' : 'text-muted-foreground'"
            title="Chat Messages"
            @click="activeTab = 'chat'"
          >
            <MessageSquare class="w-4 h-4 transition-transform duration-200" :class="{ 'animate-wiggle': playChatAnimation }" />
          </div>
        </div>
      </div>

    <!-- Empty State -->
    <div v-if="!selectedNode" class="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
      <svg class="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-sm">Select a node to view details</p>
    </div>

    <!-- Content -->
    <div v-else class="flex-1 overflow-y-auto p-4 space-y-6 [scrollbar-gutter:stable]">
      
      <!-- Node Identity -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Node Type</div>
          <div class="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono truncate max-w-[150px] border border-primary/20">
            {{ selectedNode.key }}
          </div>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
          <span class="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]" :class="nodeTypeColor"></span>
          <span class="text-sm font-medium text-foreground">{{ selectedNode.type }}</span>
        </div>
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
              {{ formatSchemaType(selectedNode.component_schema.input_type) }}
            </div>
          </div>

          <div class="space-y-2">
            <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Output Schema</div>
            <div class="p-2.5 bg-muted/20 rounded-lg border border-border/50 text-xs text-muted-foreground font-mono break-all">
              {{ formatSchemaType(selectedNode.component_schema.output_type) }}
            </div>
          </div>
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
          <div class="space-y-2">
            <!-- Status -->
            <div class="p-2 bg-muted/20 rounded border border-border/50 flex items-center justify-between">
              <div class="text-[10px] text-muted-foreground uppercase">Status</div>
              <div class="flex items-center gap-2">
                <div
                  class="w-2 h-2 rounded-full transition-colors duration-300"
                  :class="executionResult.status === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'"
                ></div>
                <div class="text-xs font-medium capitalize text-foreground">{{ executionResult.status }}</div>
              </div>
            </div>

            <!-- Metrics -->
            <div class="grid grid-cols-2 gap-2">
              <div class="p-2 bg-muted/20 rounded border border-border/50">
                <div class="text-[10px] text-muted-foreground uppercase">Start Time</div>
                <div class="text-xs font-medium">{{ formattedStartTime }}</div>
              </div>
              <div class="p-2 bg-muted/20 rounded border border-border/50">
                <div class="text-[10px] text-muted-foreground uppercase">Duration</div>
                <div class="text-xs font-medium">{{ executionResult.metrics?.duration || 0 }}ms</div>
              </div>
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

      <!-- Chat Tab -->
      <div v-else-if="activeTab === 'chat'" class="space-y-2">
        <div v-if="!executionResult" class="flex flex-col items-center justify-center text-muted-foreground py-8">
          <svg class="w-8 h-8 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p class="text-xs">No execution data available.</p>
          <p class="text-[10px] opacity-70 mt-1">Run the graph to see messages.</p>
        </div>
        <div v-else-if="chatMessages.length === 0" class="flex flex-col items-center justify-center text-muted-foreground py-8">
          <svg class="w-8 h-8 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p class="text-xs">No messages available.</p>
        </div>
        <div v-else class="px-2">
          <MessageBubble
            v-for="msg in chatMessages"
            :key="msg.id"
            :message="msg"
            :is-new="false"
            :hide-timestamp="true"
          />
        </div>
      </div>

    </div>

    <!-- Footer Actions -->
    <div v-if="selectedNode?.graph_schema" class="p-4 border-t border-border/40 bg-muted/10 backdrop-blur-sm">
      <button
        @click="handleViewSubgraph"
        class="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <span>View Subgraph</span>
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </aside>
</template>

<style scoped>
@keyframes wiggle {
  0%, 100% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(-12deg) scale(1.1);
  }
  75% {
    transform: rotate(12deg) scale(1.1);
  }
}

@keyframes ecg-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.animate-wiggle {
  animation: wiggle 0.5s ease-in-out;
}

.ecg-wrapper {
  width: 1rem;
  height: 1rem;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.ecg-container {
  display: flex;
  gap: 0;
  will-change: transform;
}

.ecg-scroll {
  animation: ecg-scroll 0.2s ease-in-out;
}

.ecg-wave {
  flex-shrink: 0;
}
</style>