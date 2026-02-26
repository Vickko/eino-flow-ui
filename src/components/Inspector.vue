<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGraph } from '@/features/graph'
import type { Message } from '@/features/chat'
import InspectorNodeIdentity from './inspector/InspectorNodeIdentity.vue'
import InspectorTabChat from './inspector/InspectorTabChat.vue'
import InspectorTabConfig from './inspector/InspectorTabConfig.vue'
import InspectorTabSwitcher from './inspector/InspectorTabSwitcher.vue'
import InspectorTabTrace from './inspector/InspectorTabTrace.vue'

const { selectedNode, nodeExecutionResults, navigateToSubgraph } = useGraph()

const handleViewSubgraph = (): void => {
  if (selectedNode.value?.graph_schema) {
    navigateToSubgraph(selectedNode.value.graph_schema)
  }
}

const activeTab = ref<'config' | 'trace' | 'chat'>('config')

const executionResult = computed(() => {
  if (!selectedNode.value) return null
  return nodeExecutionResults.value[selectedNode.value.key] ?? null
})

// 判断是否应该显示 chat tab
const shouldShowChatTab = computed(() => {
  if (!selectedNode.value?.component_schema) return false

  const inputType = selectedNode.value.component_schema.input_type
  const outputType = selectedNode.value.component_schema.output_type

  // 检查 input 是否是 Message 数组
  // 实际数据中类型信息存储在 title 字段，格式如 "[]*schema.Message"
  const isInputMessageArray = !!(
    inputType?.type === 'array' &&
    (inputType?.title?.includes('Message') || inputType?.items?.title?.includes('Message'))
  )

  // 检查 output 是否是 Message 指针
  // 格式如 "*schema.Message"
  const isOutputMessage = !!(
    outputType?.title?.includes('Message') || outputType?.goDefinition?.typeName?.includes('Message')
  )

  return isInputMessageArray && isOutputMessage
})

watch(
  () => shouldShowChatTab.value,
  (showChat) => {
    if (!showChat && activeTab.value === 'chat') {
      activeTab.value = 'config'
    }
  },
  { immediate: true }
)

const setActiveTab = (tab: 'config' | 'trace' | 'chat'): void => {
  activeTab.value = tab
}

// 合并 input 和 output 成 Message 数组
const chatMessages = computed((): Message[] => {
  if (!executionResult.value || !shouldShowChatTab.value) return []

  const messages: Message[] = []

  // 解析 input（数组）
  try {
    const input =
      typeof executionResult.value.input === 'string'
        ? JSON.parse(executionResult.value.input)
        : executionResult.value.input

    if (Array.isArray(input)) {
      input.forEach((msg: unknown, index: number) => {
        const message = msg as { role?: string; content?: string; name?: string }
        const role =
          message.role === 'system' || message.role === 'assistant' ? message.role : 'user'
        messages.push({
          id: `input-${index}`,
          conversationId: selectedNode.value?.key || 'unknown',
          role,
          content: message.content || '',
          timestamp: 0, // 不使用时间戳
          status: 'sent',
          model: message.name || undefined,
        })
      })
    }
  } catch (error) {
    console.error('Failed to parse input messages:', error)
  }

  // 解析 output（单个对象），添加到末尾
  try {
    const output =
      typeof executionResult.value.output === 'string'
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
        model: output.name || undefined,
      })
    }
  } catch (error) {
    console.error('Failed to parse output message:', error)
  }

  return messages
})
</script>

<template>
  <aside
    class="w-80 h-full rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl flex flex-col shadow-panel overflow-hidden"
  >
    <!-- Header -->
    <div class="h-14 border-b border-border/40 flex items-center justify-between px-4 bg-muted/10">
      <h2 class="font-semibold text-sm tracking-tight text-foreground">Inspector</h2>

      <!-- Toggle Switcher -->
      <InspectorTabSwitcher
        v-if="selectedNode"
        :model-value="activeTab"
        :show-chat="shouldShowChatTab"
        @update:model-value="setActiveTab"
      />
    </div>

    <!-- Empty State -->
    <div
      v-if="!selectedNode"
      class="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center"
    >
      <svg class="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="text-sm">Select a node to view details</p>
    </div>

    <!-- Content -->
    <div v-else class="flex-1 overflow-y-auto p-4 space-y-6 [scrollbar-gutter:stable]">
      <!-- Node Identity -->
      <InspectorNodeIdentity :node="selectedNode" />

      <!-- Config Tab -->
      <InspectorTabConfig v-if="activeTab === 'config'" :node="selectedNode" />

      <!-- Trace Tab -->
      <InspectorTabTrace v-else-if="activeTab === 'trace'" :execution-result="executionResult" />

      <!-- Chat Tab -->
      <InspectorTabChat
        v-else-if="activeTab === 'chat'"
        :has-execution-result="!!executionResult"
        :messages="chatMessages"
      />
    </div>

    <!-- Footer Actions -->
    <div
      v-if="selectedNode?.graph_schema"
      class="p-4 border-t border-border/40 bg-muted/10 backdrop-blur-sm"
    >
      <button
        class="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98]"
        @click="handleViewSubgraph"
      >
        <span>View Subgraph</span>
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </aside>
</template>
