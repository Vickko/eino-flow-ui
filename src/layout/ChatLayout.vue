<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { ChevronLeft, LayoutGrid } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { useChatMock } from '../composables/useChatMock';
import { useTheme } from '../composables/useTheme';
import ChatSidebar from '../components/chat/ChatSidebar.vue';
import ChatCard from '../components/chat/ChatCard.vue';

const {
  conversations,
  messages,
  activeConversationId,
  sendMessage,
  createConversation
} = useChatMock();

const { initTheme } = useTheme();

onMounted(() => {
  initTheme();
});

const activeConversation = computed(() =>
  conversations.value.find(c => c.id === activeConversationId.value)
);

const currentMessages = computed(() => {
  if (!activeConversationId.value) return [];
  return messages.value[activeConversationId.value] || [];
});

const handleSelectConversation = (id: string) => {
  activeConversationId.value = id;
};

const handleBack = () => {
  activeConversationId.value = null;
};
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-background text-foreground">
    <!-- Sidebar -->
    <div 
      class="h-full border-r border-border/40 bg-background/50 backdrop-blur-xl flex-shrink-0 transition-all duration-300"
      :class="[
        activeConversationId ? 'hidden md:flex md:w-80' : 'w-full flex'
      ]"
    >
      <ChatSidebar 
        class="w-full"
        :conversations="conversations"
        :active-id="activeConversationId"
        @select="handleSelectConversation"
        @create="createConversation"
      />
    </div>

    <!-- Chat Area -->
    <div
      class="flex-1 flex-col h-full relative p-3"
      :class="[
        activeConversationId ? 'flex' : 'hidden md:flex'
      ]"
    >
      <template v-if="activeConversationId">
        <!-- Mobile Back Button Overlay -->
        <div class="md:hidden absolute top-6 left-5 z-50">
          <button
            @click="handleBack"
            class="p-2 rounded-full bg-background/50 backdrop-blur-md border border-border/50 shadow-sm hover:bg-muted transition-colors"
          >
            <ChevronLeft class="w-5 h-5" />
          </button>
        </div>

        <ChatCard
          :messages="currentMessages"
          :conversation-title="activeConversation?.title"
          @send="sendMessage"
          class="w-full h-full"
        />
      </template>

      <div v-else class="flex-1 flex items-center justify-center text-muted-foreground rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-panel">
        <div class="text-center">
          <h3 class="text-lg font-medium">Welcome to Chat</h3>
          <p class="text-sm opacity-70">Select a conversation to start messaging</p>
        </div>
      </div>
    </div>

    <!-- Nav Switch Button (Bottom Left) -->
    <RouterLink
      to="/"
      class="absolute left-3 bottom-3 z-50 p-3 rounded-full bg-background/60 backdrop-blur-xl border border-border/40 shadow-panel hover:bg-muted/50 transition-colors"
      title="Graph"
    >
      <LayoutGrid class="w-5 h-5 text-foreground" />
    </RouterLink>
  </div>
</template>