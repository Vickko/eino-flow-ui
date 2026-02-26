<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { Bot, Lightbulb, ChevronDown, ChevronRight } from 'lucide-vue-next'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import type { Message } from '@/features/chat'
import { useTheme } from '@/composables/useTheme'
import { cn } from '@/shared/lib/utils'
import { getModelIcon } from '@/shared/utils/modelIcons'
import { useMessageBubbleEffects } from './messageBubble/useMessageBubbleEffects'

const { isDark } = useTheme()

const props = defineProps<{
  message: Message
  isNew?: boolean // 是否是新消息，用于控制动画
  hideTimestamp?: boolean // 是否隐藏时间戳
}>()

const message = toRef(props, 'message')
const isNew = toRef(props, 'isNew')

// 判断是否正在流式接收
const isStreaming = computed(() => message.value.status === 'streaming')

// 为每个消息生成唯一 ID（MdPreview 需要）
const previewId = computed(() => `preview-${message.value.id}`)
const reasoningPreviewId = computed(() => `reasoning-preview-${message.value.id}`)

// 思考内容相关
const hasReasoning = computed(() => !!message.value.reasoning_content)
const isThinking = computed(() => message.value.reasoningStatus === 'thinking')
const hasToolCalls = computed(
  () => !!message.value.tool_calls && message.value.tool_calls.length > 0
)
const hasDisplayablePayload = computed(() => {
  const hasContent = !!message.value.content?.trim()
  const hasImages = !!message.value.images && message.value.images.length > 0
  return hasContent || hasImages || hasToolCalls.value
})
// 思考区域是否折叠
const isReasoningCollapsed = ref(false)

// 判断是否处于等待首字符状态（流式中且还没有可展示内容）
const isWaitingForFirstToken = computed(() => {
  if (!isStreaming.value) return false
  return !hasDisplayablePayload.value
})

const { markdownContentRef, bubbleRef, shouldAnimateAI, shouldAnimateUser } = useMessageBubbleEffects(
  {
    message,
    isStreaming,
    hasDisplayablePayload,
    isNew,
  }
)

const isUser = computed(() => message.value.role === 'user')

const modelIcon = computed(() => {
  if (!message.value.model) return null
  return getModelIcon(message.value.model)
})

const bubbleClass = computed(() => {
  return cn(
    'relative max-w-[95%] md:max-w-[90%] px-4 py-3 text-sm shadow-sm',
    isUser.value
      ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
      : 'bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm text-foreground',
    // 流式状态下启用平滑高度动画
    isStreaming.value && 'streaming-bubble'
  )
})

const containerClass = computed(() => {
  return cn('flex flex-col w-full mb-4', isUser.value ? 'items-end' : 'items-start')
})

const timeString = computed(() => {
  return new Date(message.value.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
})

const userPreviewImages = computed(() =>
  (message.value.attachments || []).map((attachment, index) => ({
    id: `${attachment.name || 'attachment'}-${index}`,
    src: `data:${attachment.mimeType};base64,${attachment.data}`,
    alt: attachment.name || `Uploaded image ${index + 1}`,
  }))
)

const assistantPreviewImages = computed(() => {
  return (message.value.images || []).map((imageData, index) => ({
    id: `assistant-image-${index}`,
    src: `data:image/png;base64,${imageData}`,
    alt: `Generated image ${index + 1}`,
  }))
})

const toolCallStatusText = (status: 'running' | 'done' | 'error') => {
  switch (status) {
    case 'running':
      return '调用中'
    case 'done':
      return '已完成'
    case 'error':
      return '失败'
  }
}

const formatToolCallArgs = (args: unknown) => {
  if (args === undefined) return ''
  try {
    return JSON.stringify(args, null, 2)
  } catch {
    return String(args)
  }
}
</script>

<template>
  <div :class="containerClass">
    <!-- Model Label (only for assistant messages) -->
    <div
      v-if="!isUser && message.model"
      :class="['flex items-center gap-1.5 mb-1 ml-1', shouldAnimateAI ? 'ai-label-animate' : '']"
    >
      <img v-if="modelIcon" :src="modelIcon" :alt="message.model" class="w-4 h-4" />
      <Bot v-else class="w-4 h-4 text-muted-foreground/70" />
      <span class="text-sm text-muted-foreground/70">{{ message.model }}</span>
    </div>

    <!-- Reasoning/Thinking Section (only for assistant messages with reasoning) -->
    <!-- 思考区域独立于气泡，有思考内容时就显示 -->
    <div
      v-if="!isUser && hasReasoning"
      :class="['reasoning-section mt-1 mb-2 ml-1', shouldAnimateAI ? 'ai-reasoning-animate' : '']"
    >
      <!-- Header: 思考中/思考过程 -->
      <div
        class="flex items-center gap-1.5 mb-1 cursor-pointer select-none"
        @click="isReasoningCollapsed = !isReasoningCollapsed"
      >
        <Lightbulb
          class="w-4 h-4 text-muted-foreground/70"
          :class="{ 'animate-pulse': isThinking }"
        />
        <span class="text-sm text-muted-foreground/70">
          {{ isThinking ? '思考中' : '思考过程' }}
        </span>
        <component
          :is="isReasoningCollapsed ? ChevronRight : ChevronDown"
          class="w-3.5 h-3.5 text-muted-foreground/50"
        />
      </div>
      <!-- Reasoning Content (quote style) with collapse animation -->
      <div
        class="reasoning-collapse-wrapper grid transition-[grid-template-rows] duration-300 ease-out"
        :class="isReasoningCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'"
      >
        <div class="overflow-hidden">
          <div
            class="reasoning-content border-l-2 border-muted-foreground/30 pl-3 ml-0.5"
            :class="{ 'show-thinking-cursor': isThinking }"
          >
            <div class="reasoning-markdown-content text-sm text-muted-foreground/80">
              <MdPreview
                :editor-id="reasoningPreviewId"
                :model-value="message.reasoning_content || ''"
                :theme="isDark ? 'dark' : 'light'"
                language="zh-CN"
                :show-code-row-number="false"
                code-theme="github"
                preview-theme="default"
                :code-foldable="false"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isUser && userPreviewImages.length > 0"
      :class="['images-container mb-2', shouldAnimateUser ? 'image-strip-animate' : '']"
    >
      <div
        v-for="image in userPreviewImages"
        :key="image.id"
        class="generated-image-frame"
      >
        <img :src="image.src" :alt="image.alt" class="generated-image" />
      </div>
    </div>

    <!-- AI 气泡：等待时显示为小圆球，有内容后平滑展开 -->
    <div
      v-if="!isUser"
      ref="bubbleRef"
      :class="[
        'ai-bubble',
        isWaitingForFirstToken ? 'waiting-state' : 'expanded-state',
        bubbleClass,
        // 只有非等待状态且首次渲染时才播放入场动画
        !isWaitingForFirstToken && shouldAnimateAI ? 'ai-bubble-animate' : '',
      ]"
    >
      <!-- Content Area: 等待时隐藏 -->
      <div
        v-show="!isWaitingForFirstToken"
        ref="markdownContentRef"
        :class="[
          'markdown-content',
          'assistant-content',
          { 'show-streaming-cursor': isStreaming && !isThinking },
        ]"
      >
        <div v-if="hasToolCalls" class="mb-3 space-y-2">
          <div
            v-for="toolCall in message.tool_calls"
            :key="toolCall.id"
            class="rounded-md border border-border/40 bg-background/40 px-3 py-2"
          >
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span class="font-medium">{{ toolCall.name }}</span>
              <span>{{ toolCallStatusText(toolCall.status) }}</span>
            </div>
            <pre
              v-if="toolCall.args !== undefined"
              class="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground/90"
              >{{ formatToolCallArgs(toolCall.args) }}</pre
            >
          </div>
        </div>

        <MdPreview
          :editor-id="previewId"
          :model-value="message.content"
          :theme="isDark ? 'dark' : 'light'"
          language="zh-CN"
          :show-code-row-number="true"
          code-theme="github"
          preview-theme="default"
          :code-foldable="false"
        />

        <div v-if="assistantPreviewImages.length > 0" class="images-container mt-3">
          <div
            v-for="image in assistantPreviewImages"
            :key="image.id"
            class="generated-image-frame"
          >
            <img :src="image.src" :alt="image.alt" class="generated-image" />
          </div>
        </div>
      </div>

      <!-- Timestamp: 流式输出完成后才显示 -->
      <div
        v-if="!hideTimestamp && !isStreaming && !isWaitingForFirstToken"
        class="mt-1 text-[10px] opacity-70 text-right select-none text-muted-foreground"
      >
        {{ timeString }}
      </div>
    </div>

    <!-- User Bubble: 用户消息保持原来的逻辑 -->
    <div
      v-else
      ref="bubbleRef"
      :class="[bubbleClass, shouldAnimateUser ? 'user-bubble-animate' : '']"
    >
      <div
        ref="markdownContentRef"
        :class="['markdown-content', 'user-content', { 'show-streaming-cursor': isStreaming }]"
      >
        <MdPreview
          :editor-id="previewId"
          :model-value="message.content"
          :theme="isDark ? 'dark' : 'light'"
          language="zh-CN"
          :show-code-row-number="true"
          code-theme="github"
          preview-theme="default"
          :code-foldable="false"
        />
      </div>

      <div
        v-if="!hideTimestamp && !isStreaming"
        class="mt-1 text-[10px] opacity-70 text-right select-none text-primary-foreground/80"
      >
        {{ timeString }}
      </div>
    </div>
  </div>
</template>

<style scoped src="./messageBubble/MessageBubble.css"></style>
