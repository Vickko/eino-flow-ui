<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { MoreVertical, Phone, Video } from 'lucide-vue-next';
import type { Message } from '../../composables/useChatMock';
import MessageBubble from './MessageBubble.vue';
import ChatInput from './ChatInput.vue';

const props = defineProps<{
  messages: Message[];
  loading?: boolean;
  conversationTitle?: string;
}>();

const emit = defineEmits<{
  (e: 'send', text: string): void;
}>();

const scrollAreaRef = ref<HTMLDivElement | null>(null);
const isHeaderCollapsed = ref(false);

// 滚动检测相关状态
let lastScrollTop = 0;
let scrollDelta = 0;
let ticking = false;
const SCROLL_THRESHOLD = 30; // 需要累积的滚动距离才触发状态变化

const scrollToBottom = async () => {
  await nextTick();
  if (scrollAreaRef.value) {
    scrollAreaRef.value.scrollTop = scrollAreaRef.value.scrollHeight;
  }
};

const handleScroll = () => {
  if (!scrollAreaRef.value) return;

  const currentScrollTop = scrollAreaRef.value.scrollTop;
  const scrollHeight = scrollAreaRef.value.scrollHeight;
  const clientHeight = scrollAreaRef.value.clientHeight;
  const maxScroll = scrollHeight - clientHeight;

  // 在顶部附近时始终显示 header
  if (currentScrollTop < 50) {
    isHeaderCollapsed.value = false;
    lastScrollTop = currentScrollTop;
    scrollDelta = 0;
    return;
  }

  // 在底部附近时不改变状态，避免抖动
  if (currentScrollTop >= maxScroll - 5) {
    lastScrollTop = currentScrollTop;
    return;
  }

  // 累积滚动距离
  const delta = currentScrollTop - lastScrollTop;

  // 同方向累积，反方向重置
  if ((delta > 0 && scrollDelta >= 0) || (delta < 0 && scrollDelta <= 0)) {
    scrollDelta += delta;
  } else {
    scrollDelta = delta;
  }

  lastScrollTop = currentScrollTop;

  // 使用 RAF 节流
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(() => {
      // 累积足够的滚动距离才触发状态变化
      if (scrollDelta > SCROLL_THRESHOLD) {
        isHeaderCollapsed.value = true;
        scrollDelta = 0;
      } else if (scrollDelta < -SCROLL_THRESHOLD) {
        isHeaderCollapsed.value = false;
        scrollDelta = 0;
      }
      ticking = false;
    });
  }
};

watch(() => props.messages.length, () => {
  scrollToBottom();
});

onMounted(() => {
  scrollToBottom();
  scrollAreaRef.value?.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  scrollAreaRef.value?.removeEventListener('scroll', handleScroll);
});

const handleSend = (text: string) => {
  emit('send', text);
};
</script>

<template>
  <div class="h-full rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl flex flex-col shadow-panel overflow-hidden">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-6 bg-muted/10 border-b border-border/40 transition-all duration-300 ease-in-out overflow-hidden"
      :class="isHeaderCollapsed ? 'h-0 py-0 border-b-0 opacity-0' : 'h-14 py-3 opacity-100'"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-semibold text-lg">
          {{ conversationTitle?.charAt(0) || 'C' }}
        </div>
        <div>
          <h3 class="font-semibold text-sm">{{ conversationTitle || 'Chat' }}</h3>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span class="text-xs text-muted-foreground">Online</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 text-muted-foreground">
        <button class="p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <Phone class="w-5 h-5" />
        </button>
        <button class="p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <Video class="w-5 h-5" />
        </button>
        <button class="p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <MoreVertical class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Messages Area -->
    <div
      ref="scrollAreaRef"
      class="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth custom-scrollbar"
    >
      <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
        <p>No messages yet</p>
        <p class="text-sm">Start the conversation!</p>
      </div>

      <MessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
      />

      <div v-if="loading" class="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div class="bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
          <span class="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span class="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span class="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></span>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <ChatInput @send="handleSend" />
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.2);
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.4);
}
</style>
