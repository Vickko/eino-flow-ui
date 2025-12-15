<script setup lang="ts">
import { computed } from 'vue';
import { Bot } from 'lucide-vue-next';
import { MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/preview.css';
import type { Message } from '../../composables/useChat';
import { useTheme } from '../../composables/useTheme';
import { cn } from '../../lib/utils';

import logoGPT from '../../assets/logo_GPT.svg';
import logoClaude from '../../assets/logo_claude2.svg';
import logoGemini from '../../assets/logo_gemini.svg';

const { isDark } = useTheme();

const props = defineProps<{
  message: Message;
  isNew?: boolean; // 是否是新消息，用于控制动画
  hideTimestamp?: boolean; // 是否隐藏时间戳
}>();

// 判断是否应该播放动画（只有新消息才播放）
const shouldAnimateAI = computed(() => props.isNew && props.message.role === 'assistant');
const shouldAnimateUser = computed(() => props.isNew && props.message.role === 'user');

const isUser = computed(() => props.message.role === 'user');

// 为每个消息生成唯一 ID（MdPreview 需要）
const previewId = computed(() => `preview-${props.message.id}`);

const modelIcon = computed(() => {
  const model = props.message.model?.toLowerCase() || '';
  if (model.includes('gpt')) return logoGPT;
  if (model.includes('claude')) return logoClaude;
  if (model.includes('gemini')) return logoGemini;
  return null;
});

const bubbleClass = computed(() => {
  return cn(
    'relative max-w-[95%] md:max-w-[90%] px-4 py-3 text-sm shadow-sm transition-all duration-300',
    isUser.value
      ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
      : 'bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm text-foreground'
  );
});

const containerClass = computed(() => {
  return cn(
    'flex flex-col w-full mb-4',
    isUser.value ? 'items-end' : 'items-start'
  );
});

const timeString = computed(() => {
  return new Date(props.message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});
</script>

<template>
  <div :class="containerClass">
    <!-- Model Label (only for assistant messages) -->
    <div v-if="!isUser && message.model" :class="['flex items-center gap-1.5 mb-1 ml-1', shouldAnimateAI ? 'ai-label-animate' : '']">
      <img v-if="modelIcon" :src="modelIcon" :alt="message.model" class="w-4 h-4" />
      <Bot v-else class="w-4 h-4 text-muted-foreground/70" />
      <span class="text-sm text-muted-foreground/70">{{ message.model }}</span>
    </div>

    <div
      :class="[bubbleClass, shouldAnimateAI ? 'ai-bubble-animate' : '', shouldAnimateUser ? 'user-bubble-animate' : '']"
    >
      <!-- Content Area -->
      <div :class="['markdown-content', isUser ? 'user-content' : 'assistant-content']">
        <MdPreview
          :editorId="previewId"
          :modelValue="message.content"
          :theme="isDark ? 'dark' : 'light'"
          language="zh-CN"
          :showCodeRowNumber="true"
          codeTheme="github"
          previewTheme="default"
        />
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
/* 动画 */
.ai-label-animate {
  animation: label-fade-in 0.3s ease-out both;
}

@keyframes label-fade-in {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}

.ai-bubble-animate {
  animation: bubble-expand 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  transform-origin: top left;
}

@keyframes bubble-expand {
  0% { opacity: 0; transform: scale(0.3); }
  45% { opacity: 1; transform: scale(1.05); }
  100% { transform: scale(1); }
}

.user-bubble-animate {
  animation: user-bubble-expand 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
  transform-origin: bottom right;
}

@keyframes user-bubble-expand {
  0% { opacity: 0; transform: scale(0.85) translateY(16px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
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

.markdown-content :deep(.md-editor-preview ul ul) { list-style-type: circle !important; }
.markdown-content :deep(.md-editor-preview ul ul ul) { list-style-type: square !important; }
.markdown-content :deep(.md-editor-preview li) { display: list-item !important; }

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
.markdown-content :deep(.md-editor-dark [aria-roledescription="sequence"] text) {
  fill: #f3f4f6 !important;
}
.markdown-content :deep(.md-editor-dark .messageLine0),
.markdown-content :deep(.md-editor-dark .messageLine1) {
  stroke: #9ca3af !important;
}
</style>
