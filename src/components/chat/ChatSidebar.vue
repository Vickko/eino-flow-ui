<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, Plus, MessageSquare } from 'lucide-vue-next';
import type { Conversation } from '../../composables/useChatMock';
import { cn } from '../../lib/utils';

const props = withDefaults(defineProps<{
  conversations: Conversation[];
  activeId: string | null;
  collapsed?: boolean;
}>(), {
  collapsed: false
});

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'create'): void;
}>();

const searchQuery = ref('');

const filteredConversations = computed(() => {
  if (!searchQuery.value) return props.conversations;
  const query = searchQuery.value.toLowerCase();
  return props.conversations.filter(c => 
    c.title.toLowerCase().includes(query) || 
    c.lastMessage?.content.toLowerCase().includes(query)
  );
});

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 86400000 && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
</script>

<template>
  <div class="flex flex-col h-full bg-background/80 backdrop-blur-xl border-r border-border/40">
    <!-- Header -->
    <div class="p-4 flex-shrink-0">
      <!-- Title and New Button -->
      <div class="relative h-9 mb-4">
        <!-- Title -->
        <Transition name="fade-slide" mode="out-in">
          <h2 v-if="!collapsed" key="title" class="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-semibold tracking-tight">Messages</h2>
        </Transition>

        <!-- New Button -->
        <button
          @click="emit('create')"
          :class="cn(
            'absolute top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted transition-all duration-300 text-primary',
            collapsed ? 'left-1/2 -translate-x-1/2' : 'right-0'
          )"
          :title="collapsed ? 'New Chat' : ''"
        >
          <Plus class="w-5 h-5" />
        </button>
      </div>

      <!-- Search Area - 固定高度容器 -->
      <div class="relative h-10">
        <Transition name="fade-slide" mode="out-in">
          <!-- Expanded Search -->
          <div v-if="!collapsed" key="search-input" class="absolute inset-0">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search conversations..."
              class="w-full h-full pl-9 pr-4 py-2 bg-muted/50 rounded-lg text-sm border-none focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/70 transition-all"
            />
          </div>

          <!-- Collapsed Search Icon -->
          <button
            v-else
            key="search-icon"
            class="absolute inset-0 rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-center"
            title="Search"
          >
            <Search class="w-5 h-5 text-muted-foreground" />
          </button>
        </Transition>
      </div>
    </div>

    <!-- List -->
    <div class="flex-1 overflow-y-auto px-2 pb-2 space-y-1 custom-scrollbar">
      <div
        v-for="conv in (collapsed ? conversations : filteredConversations)"
        :key="conv.id"
        @click="emit('select', conv.id)"
        :class="cn(
          'group flex items-center rounded-xl cursor-pointer transition-[background-color,box-shadow] duration-200',
          collapsed ? 'p-3' : 'gap-3 p-3',
          activeId === conv.id
            ? 'bg-accent/50 shadow-sm'
            : 'hover:bg-muted/50'
        )"
        :title="collapsed ? conv.title : undefined"
      >
        <!-- Avatar - 始终保持在左侧固定位置 -->
        <div class="relative flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <MessageSquare class="w-5 h-5" />
          <span v-if="conv.unreadCount > 0" class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-background flex items-center justify-center text-[10px] text-white font-bold">
            {{ conv.unreadCount }}
          </span>
        </div>

        <!-- Text Content - 收起时隐藏 -->
        <div :class="collapsed ? 'w-0' : 'flex-1 min-w-0'" class="overflow-hidden transition-[width] duration-0">
          <Transition name="fade-slide">
            <div v-if="!collapsed" class="text-left">
              <div class="flex items-center justify-between mb-0.5">
                <span :class="cn('font-medium text-sm truncate', activeId === conv.id ? 'text-foreground' : 'text-foreground/90')">
                  {{ conv.title }}
                </span>
                <span class="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                  {{ formatTime(conv.updatedAt) }}
                </span>
              </div>
              <p class="text-xs text-muted-foreground truncate">
                {{ conv.lastMessage?.content || 'No messages yet' }}
              </p>
            </div>
          </Transition>
        </div>
      </div>

      <div v-if="!collapsed && filteredConversations.length === 0" class="p-4 text-center text-muted-foreground text-sm">
        No conversations found
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.2);
  border-radius: 4px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.4);
}

/* Transition for text content */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateX(0);
}
</style>