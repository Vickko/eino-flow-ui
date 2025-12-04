<script setup lang="ts">
import { computed } from 'vue';
import { Bot } from 'lucide-vue-next';
import MarkdownIt from 'markdown-it';
import type { Message } from '../../composables/useChatMock';
import { cn } from '../../lib/utils';

const md = new MarkdownIt();

const props = defineProps<{
  message: Message;
}>();

const isUser = computed(() => props.message.role === 'user');

const renderedContent = computed(() => {
  return md.render(props.message.content);
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
    'flex flex-col w-full mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300',
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
    <div v-if="!isUser && message.model" class="flex items-center gap-1.5 mb-1 ml-1">
      <Bot class="w-3 h-3 text-muted-foreground/70" />
      <span class="text-[10px] text-muted-foreground/70 font-medium">{{ message.model }}</span>
    </div>

    <div :class="bubbleClass">
      <!-- Content Area -->
      <div
        :class="contentClass"
        v-html="renderedContent"
      ></div>

      <!-- Timestamp -->
      <div
        class="mt-1 text-[10px] opacity-70 text-right select-none"
        :class="isUser ? 'text-primary-foreground/80' : 'text-muted-foreground'"
      >
        {{ timeString }}
      </div>
    </div>
  </div>
</template>