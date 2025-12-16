<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { MoreVertical, Phone, Video, ChevronUp, Check, Settings } from 'lucide-vue-next';
import type { Message } from '../../composables/useChat';
import MessageBubble from './MessageBubble.vue';
import ChatInput from './ChatInput.vue';
import ModelManagementDialog from './ModelManagementDialog.vue';
import { useModelManagement } from '../../composables/useModelManagement';

const props = defineProps<{
  messages: Message[];
  loading?: boolean;
  conversationTitle?: string;
}>();

const emit = defineEmits<{
  (e: 'send', payload: { text: string; model?: string }): void;
}>();

const scrollAreaRef = ref<HTMLDivElement | null>(null);
const isHeaderCollapsed = ref(false);

// 追踪新消息的 ID（用于播放动画）
const newMessageIds = ref<Set<string>>(new Set());
const isInitialLoad = ref(true);
// 追踪上一次的对话 ID，用于区分切换对话和新消息
const previousConversationId = ref<string | null>(null);

// 滚动检测相关状态
let lastScrollTop = 0;
let scrollDelta = 0;
let ticking = false;
const SCROLL_THRESHOLD = 30; // 需要累积的滚动距离才触发状态变化

const scrollToBottom = async (smooth = false) => {
  await nextTick();
  if (scrollAreaRef.value) {
    if (smooth) {
      scrollAreaRef.value.scrollTo({
        top: scrollAreaRef.value.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      scrollAreaRef.value.scrollTop = scrollAreaRef.value.scrollHeight;
    }
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

watch(() => props.messages, (newMessages, oldMessages) => {
  const newLen = newMessages.length;
  const oldLen = oldMessages?.length ?? 0;

  // 页面初次加载不标记新消息
  if (isInitialLoad.value) {
    if (newLen > 0) {
      previousConversationId.value = newMessages[0]?.conversationId ?? null;
    }
    scrollToBottom();
    return;
  }

  // 获取当前对话 ID
  const currentConversationId = newLen > 0 ? newMessages[0]?.conversationId ?? null : null;

  // 检测是否切换了对话
  const isSwitchingConversation = currentConversationId !== previousConversationId.value;

  // 更新对话 ID
  previousConversationId.value = currentConversationId;

  // 如果是切换对话，不触发动画
  if (isSwitchingConversation) {
    scrollToBottom();
    return;
  }

  // 检测新增的消息，只标记最后一条
  if (newLen > oldLen) {
    const lastMessage = newMessages[newLen - 1];
    if (lastMessage) {
      newMessageIds.value.add(lastMessage.id);
      // 动画结束后移除标记
      setTimeout(() => {
        newMessageIds.value.delete(lastMessage.id);
      }, 600);
    }
  }

  scrollToBottom();
}, { deep: false });

// 监听流式消息的内容变化，保持滚动到底部
watch(
  () => {
    const lastMsg = props.messages[props.messages.length - 1];
    return lastMsg?.status === 'streaming' ? lastMsg.content : null;
  },
  (newContent) => {
    if (newContent !== null) {
      scrollToBottom();
    }
  }
);

// 判断消息是否为新消息
const isNewMessage = (msgId: string) => newMessageIds.value.has(msgId);

onMounted(() => {
  scrollToBottom();
  scrollAreaRef.value?.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('click', handleClickOutside);
  // 初次加载完成后标记为非初始状态
  nextTick(() => {
    isInitialLoad.value = false;
  });
});

onUnmounted(() => {
  scrollAreaRef.value?.removeEventListener('scroll', handleScroll);
  document.removeEventListener('click', handleClickOutside);
});

const handleSend = (text: string) => {
  // 查找当前选中模型的 ID
  const model = models.value.find(m => m.name === selectedModel.value);
  emit('send', { text, model: model?.id });
};

// 使用模型管理 composable
const { models } = useModelManagement();

// 模型选择相关
const showModelMenu = ref(false);
// 默认选中第一个模型，列表为空时显示 --
const selectedModel = ref(models.value[0]?.name || '--');
const modelSelectorRef = ref<HTMLButtonElement | null>(null);

// 监听模型列表变化，确保 selectedModel 始终有效
watch(models, (newModels) => {
  // 如果列表为空，显示 --
  if (newModels.length === 0) {
    selectedModel.value = '--';
    return;
  }
  // 如果当前选中的模型不在列表中（被删除或重命名），回退到第一个模型
  const modelExists = newModels.some(m => m.name === selectedModel.value);
  if (!modelExists || selectedModel.value === '--') {
    selectedModel.value = newModels[0].name;
  }
}, { deep: true });

// 模型管理对话框
const showModelManagement = ref(false);

// 获取当前选中模型的图标
const getCurrentModelIcon = () => {
  const model = models.value.find(m => m.name === selectedModel.value);
  return model?.icon || models.value[0]?.icon;
};

// 打开模型管理对话框
const openModelManagement = () => {
  showModelMenu.value = false;
  showModelManagement.value = true;
};

const toggleModelMenu = () => {
  showModelMenu.value = !showModelMenu.value;
};

const selectModel = (modelName: string) => {
  if (!modelSelectorRef.value) {
    selectedModel.value = modelName;
    showModelMenu.value = false;
    return;
  }

  // 记录当前宽度
  const currentWidth = modelSelectorRef.value.offsetWidth;
  modelSelectorRef.value.style.width = `${currentWidth}px`;

  // 更新模型（触发重新渲染）
  selectedModel.value = modelName;
  showModelMenu.value = false;

  // 在下一帧获取新的自然宽度
  nextTick(() => {
    if (!modelSelectorRef.value) return;

    // 临时移除固定宽度以获取自然宽度
    modelSelectorRef.value.style.width = 'auto';
    const newWidth = modelSelectorRef.value.offsetWidth;

    // 设置回当前宽度（避免跳变）
    modelSelectorRef.value.style.width = `${currentWidth}px`;

    // 强制重绘
    modelSelectorRef.value.offsetHeight;

    // 设置目标宽度，触发 CSS transition
    modelSelectorRef.value.style.width = `${newWidth}px`;

    // 动画完成后移除固定宽度
    setTimeout(() => {
      if (modelSelectorRef.value) {
        modelSelectorRef.value.style.width = 'auto';
      }
    }, 500);
  });
};

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.model-selector')) {
    showModelMenu.value = false;
  }
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

      <!-- Model Selector -->
      <div class="px-4 pt-1.5 pb-1 relative z-20">
        <div class="flex items-center gap-2">
          <div class="model-selector relative inline-block">
            <button
              ref="modelSelectorRef"
              @click="toggleModelMenu"
              class="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-background/40 hover:bg-background/60 border-[0.5px] border-transparent hover:border-border text-sm group shadow-sm hover:shadow-md backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            >
              <div class="w-5 h-5 rounded-full overflow-hidden bg-muted/50 flex items-center justify-center border border-border/20 group-hover:scale-105 transition-transform duration-300 shrink-0">
                <img :src="getCurrentModelIcon()" alt="model icon" class="w-full h-full object-cover transition-opacity duration-200" />
              </div>
              <span class="text-foreground/80 font-medium text-xs tracking-wide group-hover:text-foreground whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">{{ selectedModel }}</span>
              <ChevronUp
                class="w-3.5 h-3.5 text-muted-foreground/70 group-hover:text-primary/80 transition-transform duration-300 ease-out shrink-0"
                :class="{ 'rotate-180': !showModelMenu }"
              />
            </button>

            <!-- Model Menu -->
            <Transition
              enter-active-class="transition-all duration-400 ease-[cubic-bezier(0.19,1,0.22,1)]"
              enter-from-class="opacity-0 scale-95 translate-y-2 blur-sm"
              enter-to-class="opacity-100 scale-100 translate-y-0 blur-0"
              leave-active-class="transition-all duration-400 ease-[cubic-bezier(0.19,1,0.22,1)]"
              leave-from-class="opacity-100 scale-100 translate-y-0 blur-0"
              leave-to-class="opacity-0 scale-95 translate-y-2 blur-sm"
            >
              <div
                v-if="showModelMenu"
                class="absolute bottom-full left-0 mb-3 w-48 bg-background/80 backdrop-blur-2xl border-[0.5px] border-border rounded-xl shadow-lg overflow-hidden origin-bottom-left"
              >
                <div class="p-1 space-y-0.5">
                  <button
                    v-for="model in models"
                    :key="model.id"
                    @click="selectModel(model.name)"
                    class="w-full px-3 py-1.5 text-left rounded-lg transition-all duration-200 group relative overflow-hidden"
                    :class="selectedModel === model.name ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/60'"
                  >
                    <div class="flex items-center gap-2.5 relative z-10">
                      <div class="w-5 h-5 rounded-full bg-background/50 border border-border/20 overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <img :src="model.icon" alt="model icon" class="w-full h-full object-cover" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                          <span class="text-xs font-medium truncate" :class="selectedModel === model.name ? 'text-primary' : 'text-foreground'">
                            {{ model.name }}
                          </span>
                          <Check v-if="selectedModel === model.name" class="w-3 h-3 text-primary" />
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Settings Button -->
          <button
            @click="openModelManagement"
            class="p-1.5 rounded-full bg-background/40 hover:bg-background/60 border-[0.5px] border-transparent hover:border-border shadow-sm hover:shadow-md backdrop-blur-md transition-all duration-300 group"
            title="管理模型"
          >
            <Settings class="w-4 h-4 text-muted-foreground/70 group-hover:text-primary/80 group-hover:rotate-90 transition-all duration-300" />
          </button>
        </div>
      </div>

      <!-- Input Area -->
      <ChatInput @send="handleSend" />
      <div class="text-center pb-1">
        <span class="text-[10px] text-muted-foreground/50">Press Enter to send, Shift + Enter for new line</span>
      </div>
    </div>

    <!-- Model Management Dialog -->
    <ModelManagementDialog
      :is-open="showModelManagement"
      @close="showModelManagement = false"
      @update:isOpen="showModelManagement = $event"
    />
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
