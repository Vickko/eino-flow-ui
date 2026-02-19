<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { MoreVertical, Phone, Video } from 'lucide-vue-next'
import type { ImageAttachment, Message } from '@/features/chat'
import MessageBubble from './MessageBubble.vue'
import ChatInput from './ChatInput.vue'

const props = defineProps<{
  messages: Message[]
  loading?: boolean
  conversationTitle?: string
}>()

const emit = defineEmits<{
  (e: 'send', payload: { text: string; attachments?: ImageAttachment[] }): void
}>()

const scrollAreaRef = ref<HTMLDivElement | null>(null)

const scrollToBottom = async (delay = 0) => {
  await nextTick()
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
  if (scrollAreaRef.value) {
    scrollAreaRef.value.scrollTop = scrollAreaRef.value.scrollHeight
  }
}

// 监听消息变化（包括切换对话）
watch(
  () => props.messages,
  () => {
    scrollToBottom()
    // 延迟再滚动一次，等待 MdPreview 渲染完成
    scrollToBottom(100)
  },
  { deep: false }
)

// 监听消息数量变化（新消息）
watch(
  () => props.messages.length,
  () => {
    scrollToBottom()
    scrollToBottom(100)
  }
)

onMounted(() => {
  scrollToBottom()
  scrollToBottom(100)
})

const handleSend = (payload: { text: string; attachments?: ImageAttachment[] }) => {
  emit('send', payload)
}
</script>

<template>
  <div class="flex flex-col h-full w-full bg-background/50 backdrop-blur-sm">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-6 py-3 bg-background/80 backdrop-blur-xl border-b border-border/40 z-10"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-semibold text-lg"
        >
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
      <div
        v-if="messages.length === 0"
        class="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50"
      >
        <p>No messages yet</p>
        <p class="text-sm">Start the conversation!</p>
      </div>

      <MessageBubble v-for="msg in messages" :key="msg.id" :message="msg" />

      <div
        v-if="loading"
        class="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <div
          class="bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1"
        >
          <span
            class="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"
          ></span>
          <span
            class="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"
          ></span>
          <span class="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></span>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="z-10">
      <ChatInput @send="handleSend" />
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
