<script lang="ts">
// 模块级别：记录已渲染过的消息 ID，用于判断是否播放入场动画
const renderedMessageIds = new Set<string>()
</script>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Bot, Lightbulb, ChevronDown, ChevronRight } from 'lucide-vue-next'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import type { Message } from '../../composables/useChat'
import { useTheme } from '../../composables/useTheme'
import { cn } from '../../lib/utils'
import { getModelIcon } from '../../utils/modelIcons'

const { isDark } = useTheme()

const props = defineProps<{
  message: Message
  isNew?: boolean // 是否是新消息，用于控制动画
  hideTimestamp?: boolean // 是否隐藏时间戳
}>()

// 判断是否正在流式接收
const isStreaming = computed(() => props.message.status === 'streaming')

// 监听复制按钮文本变化
const markdownContentRef = ref<HTMLElement | null>(null)
const bubbleRef = ref<HTMLElement | null>(null)
let copyButtonObserver: MutationObserver | null = null
let resizeObserver: ResizeObserver | null = null

// 入场动画状态（首次渲染该消息时播放）
const isFirstRender = !renderedMessageIds.has(props.message.id)
renderedMessageIds.add(props.message.id)
const shouldPlayEntranceAnimation = ref(isFirstRender)
// 延迟启动 ResizeObserver 的 timeout ID
let resizeObserverDelayId: ReturnType<typeof setTimeout> | null = null

// 立即切换到流式模式：取消入场动画，启动 ResizeObserver
const switchToStreamingMode = () => {
  // 取消延迟启动的 timeout
  if (resizeObserverDelayId) {
    clearTimeout(resizeObserverDelayId)
    resizeObserverDelayId = null
  }
  // 取消入场动画
  shouldPlayEntranceAnimation.value = false
  // 立即启动 ResizeObserver
  if (!resizeObserver && isStreaming.value) {
    setupResizeObserver()
  }
}

const setupCopyButtonObserver = () => {
  if (!markdownContentRef.value) return

  // 清理之前的 observer
  if (copyButtonObserver) {
    copyButtonObserver.disconnect()
  }

  copyButtonObserver = new MutationObserver(() => {
    // 检查所有复制按钮的状态
    const buttons = markdownContentRef.value?.querySelectorAll('.md-editor-copy-button')
    buttons?.forEach((button) => {
      const text = button.textContent?.trim()
      if (text === '已复制！') {
        button.classList.add('copied')
      } else {
        button.classList.remove('copied')
      }
    })
  })

  // 监听整个 markdown-content 区域
  copyButtonObserver.observe(markdownContentRef.value, {
    childList: true,
    subtree: true,
    characterData: true,
  })
}

// 流式状态下的平滑高度动画
let animationFrameId: number | null = null

const setupResizeObserver = () => {
  if (!markdownContentRef.value || !bubbleRef.value) return

  if (resizeObserver) {
    resizeObserver.disconnect()
  }

  // 初始化：设置气泡为当前尺寸并启用过渡
  const bubble = bubbleRef.value
  bubble.style.transition = 'height 0.15s ease-out, width 0.2s ease-out'

  resizeObserver = new ResizeObserver(() => {
    if (!isStreaming.value || !bubbleRef.value) return

    // 取消之前的动画帧
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }

    animationFrameId = requestAnimationFrame(() => {
      const bubble = bubbleRef.value
      if (!bubble) return

      // 临时移除尺寸限制以获取真实尺寸
      const currentHeight = bubble.style.height
      const currentWidth = bubble.style.width
      bubble.style.height = ''
      bubble.style.width = ''
      const targetHeight = bubble.scrollHeight
      const targetWidth = bubble.scrollWidth

      // 如果之前有固定尺寸，恢复它们然后动画到新尺寸
      if (currentHeight || currentWidth) {
        bubble.style.height = currentHeight
        bubble.style.width = currentWidth
        // 强制重排
        void bubble.offsetHeight
      }

      bubble.style.height = `${targetHeight}px`
      bubble.style.width = `${targetWidth}px`
    })
  })

  resizeObserver.observe(markdownContentRef.value)
}

// 监听流式状态变化
watch(
  () => props.message.status,
  (newStatus, oldStatus) => {
    if (newStatus === 'streaming') {
      nextTick(setupResizeObserver)
    } else if (oldStatus === 'streaming') {
      // 流式结束，清理
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
      if (bubbleRef.value) {
        bubbleRef.value.style.transition = ''
        bubbleRef.value.style.height = ''
        bubbleRef.value.style.width = ''
      }
    }
  },
  { immediate: true }
)

onMounted(() => {
  nextTick(() => {
    setupCopyButtonObserver()
    if (isStreaming.value) {
      // 如果有入场动画，延迟启动 ResizeObserver，避免打断动画
      const delay = shouldPlayEntranceAnimation.value ? 500 : 0
      if (delay > 0) {
        resizeObserverDelayId = setTimeout(() => {
          resizeObserverDelayId = null
          setupResizeObserver()
        }, delay)
      } else {
        setupResizeObserver()
      }
    }
  })
})

onUnmounted(() => {
  if (copyButtonObserver) {
    copyButtonObserver.disconnect()
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  if (resizeObserverDelayId) {
    clearTimeout(resizeObserverDelayId)
  }
})

// 判断是否应该播放动画（基于首次挂载时的状态）
const shouldAnimateAI = computed(
  () => shouldPlayEntranceAnimation.value && props.message.role === 'assistant'
)
const shouldAnimateUser = computed(
  () => shouldPlayEntranceAnimation.value && props.message.role === 'user'
)

const isUser = computed(() => props.message.role === 'user')

// 为每个消息生成唯一 ID（MdPreview 需要）
const previewId = computed(() => `preview-${props.message.id}`)
const reasoningPreviewId = computed(() => `reasoning-preview-${props.message.id}`)

// 思考内容相关
const hasReasoning = computed(() => !!props.message.reasoning_content)
const isThinking = computed(() => props.message.reasoningStatus === 'thinking')
const hasToolCalls = computed(
  () => !!props.message.tool_calls && props.message.tool_calls.length > 0
)
const hasDisplayablePayload = computed(() => {
  const hasContent = !!props.message.content?.trim()
  const hasImages = !!props.message.images && props.message.images.length > 0
  return hasContent || hasImages || hasToolCalls.value
})
// 思考区域是否折叠
const isReasoningCollapsed = ref(false)

// 判断是否处于等待首字符状态（流式中且还没有可展示内容）
const isWaitingForFirstToken = computed(() => {
  if (!isStreaming.value) return false
  return !hasDisplayablePayload.value
})

// 一旦出现任意可展示内容（文本、图片、工具调用），立即退出等待小圆点
watch(
  () => hasDisplayablePayload.value,
  (hasPayload, hadPayload) => {
    if (!isStreaming.value || !hasPayload || hadPayload) return
    if (resizeObserverDelayId || shouldPlayEntranceAnimation.value) {
      switchToStreamingMode()
    }
  }
)

const modelIcon = computed(() => {
  if (!props.message.model) return null
  return getModelIcon(props.message.model)
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
  return new Date(props.message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
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
            >{{ formatToolCallArgs(toolCall.args) }}</pre>
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

        <!-- 图片展示区域 -->
        <div v-if="message.images && message.images.length > 0" class="images-container mt-3">
          <img
            v-for="(imageData, index) in message.images"
            :key="index"
            :src="`data:image/png;base64,${imageData}`"
            :alt="`Generated image ${index + 1}`"
            class="generated-image"
          />
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

<style scoped>
/* AI 气泡基础样式 */
.ai-bubble {
  transform-origin: top left;
  transition:
    width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    height 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    padding 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    border-radius 0.35s ease-out,
    box-shadow 0.3s ease-out,
    opacity 0.3s ease-out;
}

/* 等待状态：小圆球 */
.ai-bubble.waiting-state {
  width: 24px !important;
  height: 24px !important;
  min-width: 24px;
  min-height: 24px;
  max-width: 24px;
  max-height: 24px;
  padding: 0 !important;
  border-radius: 4px 12px 12px 12px !important;
  animation: breathing 1.5s ease-in-out infinite;
  overflow: hidden;
}

/* 展开状态：正常气泡 */
.ai-bubble.expanded-state {
  animation: none;
  /* 让 bubbleClass 的样式生效 */
}

@keyframes breathing {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.7;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  }
}

/* 思考区域动画 */
.ai-reasoning-animate {
  animation: reasoning-fade-in 0.4s ease-out both;
}

@keyframes reasoning-fade-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 思考区域样式 */
.reasoning-section {
  max-width: 95%;
}

@media (min-width: 768px) {
  .reasoning-section {
    max-width: 90%;
  }
}

/* 思考内容的 markdown 样式 */
.reasoning-markdown-content {
  --md-bk-color: transparent !important;
}

.reasoning-markdown-content :deep(.md-editor),
.reasoning-markdown-content :deep(.md-editor-dark),
.reasoning-markdown-content :deep(.md-editor-preview-wrapper),
.reasoning-markdown-content :deep(.md-editor-preview) {
  background: transparent !important;
}

.reasoning-markdown-content :deep(.md-editor-preview) {
  word-break: break-word;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: hsl(var(--muted-foreground) / 0.8);
}

.reasoning-markdown-content :deep(.md-editor-preview p),
.reasoning-markdown-content :deep(.md-editor-preview li),
.reasoning-markdown-content :deep(.md-editor-preview h1),
.reasoning-markdown-content :deep(.md-editor-preview h2),
.reasoning-markdown-content :deep(.md-editor-preview h3),
.reasoning-markdown-content :deep(.md-editor-preview h4),
.reasoning-markdown-content :deep(.md-editor-preview h5),
.reasoning-markdown-content :deep(.md-editor-preview h6) {
  color: hsl(var(--muted-foreground) / 0.8);
}

/* 流式状态气泡 - 配合 JS 动画 */
.streaming-bubble {
  overflow: hidden;
}

/* 流式接收时的闪烁光标 - 使用 ::after 伪元素定位在文字末尾 */
@keyframes cursor-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* 思考区域的光标 */
.show-thinking-cursor :deep(.md-editor-preview > *:last-child::after) {
  content: '';
  display: inline-block;
  width: 2px;
  height: 1em;
  background-color: hsl(var(--muted-foreground) / 0.8);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: cursor-blink 1s step-end infinite;
}

/* 气泡区域的光标 */
.show-streaming-cursor :deep(.md-editor-preview > *:last-child::after) {
  content: '';
  display: inline-block;
  width: 2px;
  height: 1em;
  background-color: hsl(var(--foreground));
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: cursor-blink 1s step-end infinite;
}

/* 用户消息的光标颜色 */
.user-content.show-streaming-cursor :deep(.md-editor-preview > *:last-child::after) {
  background-color: hsl(var(--primary-foreground));
}

/* 动画 */
.ai-label-animate {
  animation: label-fade-in 0.3s ease-out both;
}

@keyframes label-fade-in {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.ai-bubble-animate {
  animation: bubble-expand 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  transform-origin: top left;
}

@keyframes bubble-expand {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  45% {
    opacity: 1;
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.user-bubble-animate {
  animation: user-bubble-expand 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
  transform-origin: bottom right;
}

@keyframes user-bubble-expand {
  0% {
    opacity: 0;
    transform: scale(0.85) translateY(16px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* md-editor 背景透明 */
.markdown-content {
  --md-bk-color: transparent !important;
}

.markdown-content :deep(.md-editor),
.markdown-content :deep(.md-editor-dark),
.markdown-content :deep(.md-editor-preview-wrapper),
.markdown-content :deep(.md-editor-preview) {
  background: transparent !important;
}

.markdown-content :deep(.md-editor-preview) {
  word-break: break-word;
  font-size: 0.875rem;
  line-height: 1.6;
}

/* 用户消息 - 白色文字 */
.user-content :deep(.md-editor-preview),
.user-content :deep(.md-editor-preview p),
.user-content :deep(.md-editor-preview li),
.user-content :deep(.md-editor-preview h1),
.user-content :deep(.md-editor-preview h2),
.user-content :deep(.md-editor-preview h3),
.user-content :deep(.md-editor-preview h4),
.user-content :deep(.md-editor-preview h5),
.user-content :deep(.md-editor-preview h6),
.user-content :deep(.md-editor-preview strong),
.user-content :deep(.md-editor-preview em),
.user-content :deep(.md-editor-preview blockquote),
.user-content :deep(.md-editor-preview a) {
  color: hsl(var(--primary-foreground)) !important;
}

.user-content :deep(.md-editor-preview code) {
  background: hsl(var(--primary-foreground) / 0.2) !important;
  color: hsl(var(--primary-foreground)) !important;
}

.user-content :deep(.md-editor-preview blockquote) {
  border-color: hsl(var(--primary-foreground) / 0.3) !important;
}

/* AI 消息 - 跟随主题 */
.assistant-content :deep(.md-editor-preview),
.assistant-content :deep(.md-editor-preview p),
.assistant-content :deep(.md-editor-preview li),
.assistant-content :deep(.md-editor-preview h1),
.assistant-content :deep(.md-editor-preview h2),
.assistant-content :deep(.md-editor-preview h3),
.assistant-content :deep(.md-editor-preview h4),
.assistant-content :deep(.md-editor-preview h5),
.assistant-content :deep(.md-editor-preview h6) {
  color: hsl(var(--foreground));
}

.assistant-content :deep(.md-editor-preview blockquote) {
  border-color: hsl(var(--border));
  color: hsl(var(--muted-foreground));
}

/* 列表样式 */
.markdown-content :deep(.md-editor-preview ul) {
  list-style-type: disc !important;
  padding-left: 1.5em !important;
}

.markdown-content :deep(.md-editor-preview ol) {
  list-style-type: decimal !important;
  padding-left: 1.5em !important;
}

.markdown-content :deep(.md-editor-preview ul ul) {
  list-style-type: circle !important;
}
.markdown-content :deep(.md-editor-preview ul ul ul) {
  list-style-type: square !important;
}
.markdown-content :deep(.md-editor-preview li) {
  display: list-item !important;
}

/* 任务列表 */
.markdown-content :deep(.md-editor-preview ul.contains-task-list),
.markdown-content :deep(.md-editor-preview li.task-list-item) {
  list-style-type: none !important;
}

.markdown-content :deep(.task-list-item-checkbox) {
  -webkit-appearance: none !important;
  appearance: none !important;
  width: 14px !important;
  height: 14px !important;
  border: 1.5px solid hsl(var(--muted-foreground) / 0.4) !important;
  border-radius: 2px !important;
  margin-right: 8px !important;
  vertical-align: middle !important;
  cursor: pointer !important;
  position: relative !important;
  background: transparent !important;
}

.markdown-content :deep(.task-list-item-checkbox:checked) {
  border-color: hsl(var(--foreground) / 0.5) !important;
}

.markdown-content :deep(.task-list-item-checkbox:checked)::after {
  content: '' !important;
  position: absolute !important;
  left: 3.5px !important;
  top: 0.5px !important;
  width: 4px !important;
  height: 8px !important;
  border: solid hsl(var(--foreground) / 0.7) !important;
  border-width: 0 1.5px 1.5px 0 !important;
  transform: rotate(45deg) !important;
}

/* 代码块 */
.markdown-content :deep(.md-editor-preview .code-block) {
  border-radius: 0.5rem !important;
  overflow: hidden !important;
  margin: 0.75rem 0 !important;
}

/* 代码块：去掉独立 header，融入代码块内部 */
.markdown-content :deep(.md-editor-preview .md-editor-code) {
  position: relative !important;
}

/* 禁用 details 折叠功能 */
.markdown-content :deep(.md-editor-preview details.md-editor-code) {
  pointer-events: none !important;
}

.markdown-content :deep(.md-editor-preview details.md-editor-code > *) {
  pointer-events: auto !important;
}

.markdown-content :deep(.md-editor-preview .md-editor-code .md-editor-code-head) {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: auto !important;
  padding: 8px 12px !important;
  background: transparent !important;
  border-radius: 0 !important;
  z-index: 10 !important;
  display: flex !important;
  justify-content: flex-end !important;
  align-items: center !important;
  cursor: default !important;
  pointer-events: none !important;
}

/* 隐藏装饰性的三个彩色圆点 */
.markdown-content :deep(.md-editor-preview .md-editor-code-head .md-editor-code-flag > span) {
  display: none !important;
}

/* 隐藏折叠按钮 */
.markdown-content :deep(.md-editor-preview .md-editor-code-head .md-editor-collapse-tips) {
  display: none !important;
}

/* 语言标识样式 - 绝对定位到左侧 */
.markdown-content :deep(.md-editor-preview .md-editor-code-head .md-editor-code-lang) {
  position: absolute !important;
  left: 1em !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  font-size: 11px !important;
  color: hsl(var(--muted-foreground)) !important;
  opacity: 0.6 !important;
  line-height: 1 !important;
  text-transform: uppercase !important;
  font-weight: 400 !important;
  letter-spacing: 0.5px !important;
}

/* 复制按钮容器 */
.markdown-content :deep(.md-editor-preview .md-editor-code-head .md-editor-code-action) {
  margin-right: 0 !important;
  pointer-events: auto !important;
}

/* 复制按钮样式 */
.markdown-content
  :deep(.md-editor-preview .md-editor-code .md-editor-code-head .md-editor-copy-button) {
  width: 24px !important;
  height: 24px !important;
  border-radius: 4px !important;
  transition: all 0.2s !important;
  opacity: 0.4 !important;
  user-select: none !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  position: relative !important;
  font-size: 0 !important;
  text-indent: -9999px !important;
  overflow: hidden !important;
  padding: 0 !important;
  margin: 0 !important;
  line-height: 0 !important;
}

/* 隐藏按钮内的所有文字子元素 */
.markdown-content
  :deep(.md-editor-preview .md-editor-code .md-editor-code-head .md-editor-copy-button > *) {
  font-size: 0 !important;
  text-indent: -9999px !important;
  color: transparent !important;
}

/* 默认显示复制图标 */
.markdown-content
  :deep(.md-editor-preview .md-editor-code .md-editor-code-head .md-editor-copy-button::before) {
  content: '' !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  width: 14px !important;
  height: 14px !important;
  text-indent: 0 !important;
  background-color: hsl(var(--muted-foreground)) !important;
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='14' height='14' x='8' y='8' rx='2' ry='2'/%3E%3Cpath d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'/%3E%3C/svg%3E") !important;
  mask-size: contain !important;
  mask-repeat: no-repeat !important;
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='14' height='14' x='8' y='8' rx='2' ry='2'/%3E%3Cpath d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'/%3E%3C/svg%3E") !important;
  -webkit-mask-size: contain !important;
  -webkit-mask-repeat: no-repeat !important;
}

/* 只在悬浮按钮本身时才亮起 */
.markdown-content
  :deep(.md-editor-preview .md-editor-code .md-editor-code-head .md-editor-copy-button:hover) {
  background-color: hsl(var(--foreground) / 0.1) !important;
  opacity: 1 !important;
}

/* 点击时的视觉反馈 */
.markdown-content
  :deep(.md-editor-preview .md-editor-code .md-editor-code-head .md-editor-copy-button:active) {
  transform: scale(0.9) !important;
  opacity: 0.8 !important;
}

/* 复制成功后显示文字 */
.markdown-content
  :deep(.md-editor-preview .md-editor-code .md-editor-code-head .md-editor-copy-button.copied) {
  width: auto !important;
  padding: 0 8px !important;
  font-size: 11px !important;
  text-indent: 0 !important;
  line-height: 24px !important;
  color: hsl(var(--muted-foreground)) !important;
}

.markdown-content
  :deep(
    .md-editor-preview .md-editor-code .md-editor-code-head .md-editor-copy-button.copied::before
  ) {
  display: none !important;
}

/* 代码块 body 增加顶部 padding 给 header 留空间 */
.markdown-content :deep(.md-editor-preview .md-editor-code pre code) {
  padding-top: 2.5em !important;
  border-radius: 0.5rem !important;
}

/* 行号位置也相应下移，跳过 header 区域 */
.markdown-content :deep(.md-editor-preview .md-editor-code pre code span[rn-wrapper]) {
  top: 2.5em !important;
}

/* 代码块整体圆角 */
.markdown-content :deep(.md-editor-preview .md-editor-code pre) {
  border-radius: 0.5rem !important;
  margin: 0 !important;
}

.markdown-content :deep(.md-editor-preview .code-block > *),
.markdown-content :deep(.md-editor-preview .code-block pre) {
  margin: 0 !important;
  padding: 0 !important;
}

.markdown-content :deep(.md-editor-preview pre) {
  border-radius: 0 !important;
  margin: 0 !important;
}

/* 表格 */
.markdown-content :deep(.md-editor-preview table th),
.markdown-content :deep(.md-editor-preview table td) {
  border-color: hsl(var(--border));
}

/* 图片 */
.markdown-content :deep(.md-editor-preview img) {
  border-radius: 0.5rem;
  max-width: 100%;
}

/* 水平线 */
.markdown-content :deep(.md-editor-preview hr) {
  border-color: hsl(var(--border));
}

/* 图片展示 */
.images-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.generated-image {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease-out;
}

.generated-image:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Mermaid 暗黑模式修复 */

/* 时序图 - 背景和边框 */
.markdown-content :deep(.md-editor-dark .actor-top),
.markdown-content :deep(.md-editor-dark .actor-bottom) {
  fill: #374151 !important;
  stroke: #6b7280 !important;
}

/* 时序图 - 文字（包括 box 内的文字） */
.markdown-content :deep(.md-editor-dark [aria-roledescription='sequence'] text),
.markdown-content :deep(.md-editor-dark [aria-roledescription='sequence'] tspan),
.markdown-content :deep(.md-editor-dark .actor text),
.markdown-content :deep(.md-editor-dark .actor tspan),
.markdown-content :deep(.md-editor-dark .labelBox text),
.markdown-content :deep(.md-editor-dark .labelBox tspan) {
  fill: #f3f4f6 !important;
}

/* 时序图 - 连接线 */
.markdown-content :deep(.md-editor-dark .messageLine0),
.markdown-content :deep(.md-editor-dark .messageLine1) {
  stroke: #9ca3af !important;
}

/* 流程图 - 节点背景和边框 */
.markdown-content :deep(.md-editor-dark .node rect),
.markdown-content :deep(.md-editor-dark .node circle),
.markdown-content :deep(.md-editor-dark .node ellipse),
.markdown-content :deep(.md-editor-dark .node polygon),
.markdown-content :deep(.md-editor-dark .node path) {
  fill: #374151 !important;
  stroke: #6b7280 !important;
}

/* 流程图 - 节点文字 */
.markdown-content :deep(.md-editor-dark .nodeLabel),
.markdown-content :deep(.md-editor-dark .node text) {
  fill: #f3f4f6 !important;
  color: #f3f4f6 !important;
}

/* 流程图 - 连接线 */
.markdown-content :deep(.md-editor-dark .edgePath .path),
.markdown-content :deep(.md-editor-dark .flowchart-link) {
  stroke: #9ca3af !important;
}

/* 流程图和状态图 - 连接线标签（浅色背景 + 深色文字） */
.markdown-content :deep(.md-editor-dark .edgeLabel rect) {
  fill: #e5e7eb !important;
  stroke: #6b7280 !important;
}

.markdown-content :deep(.md-editor-dark .labelBkg) {
  background-color: #e5e7eb !important;
  color: #1f2937 !important;
}

.markdown-content :deep(.md-editor-dark .labelBkg p) {
  color: #1f2937 !important;
}

/* 箭头标记 */
.markdown-content :deep(.md-editor-dark marker path) {
  fill: #9ca3af !important;
  stroke: #9ca3af !important;
}

/* 类图 */
.markdown-content :deep(.md-editor-dark .classGroup rect),
.markdown-content :deep(.md-editor-dark .classGroup line) {
  stroke: #6b7280 !important;
  fill: #374151 !important;
}

.markdown-content :deep(.md-editor-dark .classLabel .box) {
  fill: #374151 !important;
  stroke: #6b7280 !important;
}

.markdown-content :deep(.md-editor-dark .classLabel .label),
.markdown-content :deep(.md-editor-dark .classGroup text) {
  fill: #f3f4f6 !important;
}

/* 状态图 - 起止节点 */
.markdown-content :deep(.md-editor-dark .state-start circle),
.markdown-content :deep(.md-editor-dark .state-end circle) {
  fill: #6b7280 !important;
  stroke: #9ca3af !important;
}

/* 状态图 - 状态节点 */
.markdown-content :deep(.md-editor-dark .stateGroup rect) {
  fill: #374151 !important;
  stroke: #6b7280 !important;
}

.markdown-content :deep(.md-editor-dark .stateLabel text) {
  fill: #f3f4f6 !important;
}

/* 状态图 - 连接线文字 */
.markdown-content :deep(.md-editor-dark .transition text),
.markdown-content :deep(.md-editor-dark .transition tspan) {
  fill: #1f2937 !important;
}

/* 甘特图 - 网格 */
.markdown-content :deep(.md-editor-dark .grid .tick line) {
  stroke: #4b5563 !important;
}

.markdown-content :deep(.md-editor-dark .grid .tick text) {
  fill: #9ca3af !important;
}

/* 甘特图 - 文字 */
.markdown-content :deep(.md-editor-dark .taskText),
.markdown-content :deep(.md-editor-dark .titleText),
.markdown-content :deep(.md-editor-dark .sectionTitle),
.markdown-content :deep(.md-editor-dark .taskTextOutsideRight),
.markdown-content :deep(.md-editor-dark .taskTextOutsideLeft) {
  fill: #f3f4f6 !important;
}

/* ER 图 */
.markdown-content :deep(.md-editor-dark .er .entityBox) {
  fill: #374151 !important;
  stroke: #6b7280 !important;
}

.markdown-content :deep(.md-editor-dark .er .entityLabel) {
  fill: #f3f4f6 !important;
}

.markdown-content :deep(.md-editor-dark .er .relationshipLine) {
  stroke: #9ca3af !important;
}

/* 饼图 */
.markdown-content :deep(.md-editor-dark .pieCircle) {
  stroke: #374151 !important;
}

.markdown-content :deep(.md-editor-dark .pieTitleText),
.markdown-content :deep(.md-editor-dark .legend text),
.markdown-content :deep(.md-editor-dark .slice text),
.markdown-content :deep(.md-editor-dark .pieLabel) {
  fill: #f3f4f6 !important;
}
</style>
