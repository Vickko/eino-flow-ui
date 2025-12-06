<script setup lang="ts">
import { computed } from 'vue';
import { Bot } from 'lucide-vue-next';
import MarkdownIt from 'markdown-it';
import type { Message } from '../../composables/useChatMock';
import { cn } from '../../lib/utils';

import logoGPT from '../../assets/logo_GPT.svg';
import logoClaude from '../../assets/logo_claude2.svg';
import logoGemini from '../../assets/logo_gemini.svg';

const md = new MarkdownIt();

const props = defineProps<{
  message: Message;
  isNew?: boolean; // 是否是新消息，用于控制动画
  hideTimestamp?: boolean; // 是否隐藏时间戳
}>();

// 判断是否应该播放动画（只有新消息才播放）
const shouldAnimateAI = computed(() => props.isNew && props.message.role === 'assistant');
const shouldAnimateUser = computed(() => props.isNew && props.message.role === 'user');

const isUser = computed(() => props.message.role === 'user');

const renderedContent = computed(() => {
  return md.render(props.message.content);
});

const modelIcon = computed(() => {
  const model = props.message.model?.toLowerCase() || '';
  if (model.includes('gpt')) return logoGPT;
  if (model.includes('claude')) return logoClaude;
  if (model.includes('gemini')) return logoGemini;
  return null;
});

const bubbleClass = computed(() => {
  return cn(
    'relative max-w-[85%] md:max-w-[75%] px-4 py-3 text-sm shadow-sm transition-all duration-300',
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

const contentClass = computed(() => {
  return cn(
    'prose prose-sm max-w-none leading-relaxed break-words',
    isUser.value ? 'prose-invert' : 'dark:prose-invert'
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
      <div
        :class="contentClass"
        v-html="renderedContent"
      ></div>

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
/* AI 模型标签：从左往右淡入 */
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

/* AI 气泡：从左上角 bouncy 展开 */
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

/* 用户气泡：从下方滑入并展开 */
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
</style>