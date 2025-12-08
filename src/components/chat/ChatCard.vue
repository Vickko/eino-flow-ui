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

// 追踪新消息的 ID（用于播放动画）
const newMessageIds = ref<Set<string>>(new Set());
const isInitialLoad = ref(true);
// 追踪上一次的消息列表，用于区分切换对话和新消息
const previousMessageIds = ref<string[]>([]);

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

  // 在顶部附近时始终显示 header
  if (currentScrollTop < 50) {
    isHeaderCollapsed.value = false;
    lastScrollTop = currentScrollTop;
    scrollDelta = 0;
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

watch(() => props.messages.length, (newLen, oldLen) => {
  // 页面初次加载不标记新消息
  if (isInitialLoad.value) {
    previousMessageIds.value = props.messages.map(m => m.id);
    scrollToBottom();
    return;
  }

  const currentMessageIds = props.messages.map(m => m.id);

  // 检测是否是切换对话：如果之前的消息 ID 都不在当前列表中，说明是切换了对话
  const isSwitchingConversation = previousMessageIds.value.length > 0 &&
    !previousMessageIds.value.some(id => currentMessageIds.includes(id));

  // 更新消息 ID 列表
  previousMessageIds.value = currentMessageIds;

  // 如果是切换对话，不触发动画
  if (isSwitchingConversation) {
    scrollToBottom();
    return;
  }

  // 检测新增的消息，只标记最后一条
  if (newLen > oldLen) {
    const lastMessage = props.messages[props.messages.length - 1];
    if (lastMessage) {
      newMessageIds.value.add(lastMessage.id);
      // 动画结束后移除标记
      setTimeout(() => {
        newMessageIds.value.delete(lastMessage.id);
      }, 600);
    }
  }

  scrollToBottom();
});

// 判断消息是否为新消息
const isNewMessage = (msgId: string) => newMessageIds.value.has(msgId);

onMounted(() => {
  scrollToBottom();
  scrollAreaRef.value?.addEventListener('scroll', handleScroll, { passive: true });
  // 初次加载完成后标记为非初始状态
  nextTick(() => {
    isInitialLoad.value = false;
  });
});

onUnmounted(() => {
  scrollAreaRef.value?.removeEventListener('scroll', handleScroll);
});

const handleSend = (text: string) => {
  emit('send', text);
};
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden rounded-xl">
    <!-- Header (底层卡片露出的顶部) -->
    <div
      class="flex items-center justify-between px-4 bg-muted/30 rounded-t-xl border border-border/40 border-b-0 overflow-hidden shrink-0 h-10 py-2"
    >
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-semibold text-xs">
          {{ conversationTitle?.charAt(0) || 'C' }}
        </div>
        <h3 class="font-semibold text-sm">{{ conversationTitle || 'Chat' }}</h3>
      </div>

      <div class="flex items-center gap-1 text-muted-foreground">
        <button class="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <Phone class="w-4 h-4" />
        </button>
        <button class="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <Video class="w-4 h-4" />
        </button>
        <button class="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <MoreVertical class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Main Content (上层卡片，覆盖在顶栏之上) -->
    <div
      class="flex-1 flex flex-col rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-panel overflow-hidden relative z-10 transition-[margin] duration-300 ease-in-out"
      :class="isHeaderCollapsed ? '-mt-10' : '-mt-1'"
    >
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
        :is-new="isNewMessage(msg.id)"
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
      <div class="text-center pb-1">
        <span class="text-[10px] text-muted-foreground/50">Press Enter to send, Shift + Enter for new line</span>
      </div>
    </div>
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
