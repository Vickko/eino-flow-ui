<script lang="ts">
// 模块级别：记录已渲染过的消息 ID，用于判断是否播放入场动画
const renderedMessageIds = new Set<string>()
</script>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Bot } from 'lucide-vue-next'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import type { Message } from '../../composables/useChat'
import { useTheme } from '../../composables/useTheme'
import { cn } from '../../lib/utils'

import logoGPT from '../../assets/logo_GPT.svg'
import logoClaude from '../../assets/logo_claude2.svg'
import logoGemini from '../../assets/logo_gemini.svg'

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
  // 初始化内容长度，避免首次 watch 误触发
  lastContentLength = props.message.content?.length ?? 0

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

// 监听流式消息内容变化，一旦开始吐字就切换到流式模式
let lastContentLength = 0
watch(
  () => props.message.content,
  (newContent) => {
    const newLength = newContent?.length ?? 0
    // 只在流式状态且内容长度增加时触发
    if (isStreaming.value && newLength > lastContentLength) {
      // 如果还在等待入场动画，立即切换到流式模式
      if (resizeObserverDelayId || shouldPlayEntranceAnimation.value) {
        switchToStreamingMode()
      }
    }
    lastContentLength = newLength
  }
)

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

const modelIcon = computed(() => {
  const model = props.message.model?.toLowerCase() || ''
  if (model.includes('gpt')) return logoGPT
  if (model.includes('claude')) return logoClaude
  if (model.includes('gemini')) return logoGemini
  return null
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

    <div
      ref="bubbleRef"
      :class="[
        bubbleClass,
        shouldAnimateAI ? 'ai-bubble-animate' : '',
        shouldAnimateUser ? 'user-bubble-animate' : '',
      ]"
    >
      <!-- Content Area -->
      <div
        ref="markdownContentRef"
        :class="['markdown-content', isUser ? 'user-content' : 'assistant-content']"
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
        <!-- 流式接收时显示闪烁光标 -->
        <span v-if="isStreaming" class="streaming-cursor"></span>
      </div>

      <!-- Timestamp -->
      <div
        v-if="!hideTimestamp"
        class="mt-1 text-[10px] opacity-70 text-right select-none"
        :class="isUser ? 'text-primary-foreground/80' : 'text-muted-foreground'"
      >
        {{ timeString }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 流式状态气泡 - 配合 JS 动画 */
.streaming-bubble {
  overflow: hidden;
}

/* 流式接收时的闪烁光标 */
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background-color: hsl(var(--foreground));
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: cursor-blink 1s step-end infinite;
}

@keyframes cursor-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
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

/* Mermaid 时序图暗黑模式修复 */
.markdown-content :deep(.md-editor-dark .actor-top),
.markdown-content :deep(.md-editor-dark .actor-bottom) {
  fill: #374151 !important;
  stroke: #6b7280 !important;
}
.markdown-content :deep(.md-editor-dark [aria-roledescription='sequence'] text) {
  fill: #f3f4f6 !important;
}
.markdown-content :deep(.md-editor-dark .messageLine0),
.markdown-content :deep(.md-editor-dark .messageLine1) {
  stroke: #9ca3af !important;
}
</style>
