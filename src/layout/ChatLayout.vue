<script setup lang="ts">
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { useChatShell } from '@/features/chat'
import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import ChatCard from '@/components/chat/ChatCard.vue'

const {
  conversations,
  activeConversationId,
  sendMessage,
  createConversation,
  isStreaming,
  stopStreaming,
  isExpanded,
  handleMouseEnter,
  handleMouseLeave,
  showChatSidebar,
  activeConversation,
  currentMessages,
  handleSelectConversation,
  handleBack,
  toggleSidebar,
} = useChatShell()
</script>

<template>
  <div class="flex h-screen w-full overflow-hidden bg-background text-foreground">
    <!-- Sidebar with Collapse -->
    <div
      class="h-full border-r border-border/40 bg-background/50 backdrop-blur-xl flex-shrink-0 transition-all duration-300 relative sidebar-container z-30"
      :class="[
        activeConversationId
          ? showChatSidebar
            ? 'hidden md:flex md:w-80'
            : 'hidden md:flex md:w-20'
          : 'w-full flex',
      ]"
    >
      <!-- Sidebar Content -->
      <ChatSidebar
        class="w-full"
        :conversations="conversations"
        :active-id="activeConversationId"
        :collapsed="!showChatSidebar && activeConversationId !== null"
        @select="handleSelectConversation"
        @create="createConversation"
      />

      <!-- Toggle Button (desktop only, protruding from right edge) -->
      <button
        v-if="activeConversationId"
        class="toggle-btn hidden md:flex absolute top-1/2 -right-[21px] -translate-y-1/2 w-5 h-12 bg-background/80 backdrop-blur-md border-y border-r border-border/40 rounded-r-md items-center justify-center hover:bg-muted/50 transition-all duration-200 z-50 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)]"
        :title="showChatSidebar ? '收起侧边栏' : '展开侧边栏'"
        @click="toggleSidebar"
      >
        <ChevronLeft v-if="showChatSidebar" class="w-3.5 h-3.5" />
        <ChevronRight v-else class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Chat Area -->
    <div
      class="flex-1 min-h-0 flex-col h-full relative p-3"
      :class="[activeConversationId ? 'flex' : 'hidden md:flex']"
    >
      <template v-if="activeConversationId">
        <!-- Mobile Back Button Overlay -->
        <div class="md:hidden absolute top-6 left-5 z-50">
          <button
            class="p-2 rounded-full bg-background/50 backdrop-blur-md border border-border/50 shadow-sm hover:bg-muted transition-colors"
            @click="handleBack"
          >
            <ChevronLeft class="w-5 h-5" />
          </button>
        </div>

        <ChatCard
          :messages="currentMessages"
          :conversation-title="activeConversation?.title"
          :is-streaming="isStreaming"
          class="w-full h-full"
          @send="
            ({ text, model, thinking, attachments }) =>
              sendMessage(text, model, thinking, attachments)
          "
          @stop="stopStreaming"
        />
      </template>

      <div
        v-else
        class="flex-1 flex items-center justify-center text-muted-foreground rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-panel"
      >
        <div class="text-center">
          <h3 class="text-lg font-medium">Welcome to Chat</h3>
          <p class="text-sm opacity-70">Select a conversation to start messaging</p>
        </div>
      </div>
    </div>

    <!-- Nav Switch Button (Bottom Left) -->
    <div
      class="nav-switch-trigger absolute left-0 bottom-0 z-50 w-24 h-24 pointer-events-auto"
      :class="{ expanded: isExpanded }"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <RouterLink
        to="/"
        class="nav-switch-btn absolute left-3 bottom-3 p-3 rounded-full bg-background/60 backdrop-blur-xl border border-border/40 shadow-panel hover:bg-muted/50 transition-all duration-300"
        title="Graph"
      >
        <LayoutGrid class="w-5 h-5 text-foreground" />
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
/* Nav Switch Button Auto-hide */
.nav-switch-trigger {
  pointer-events: none;
}

.nav-switch-trigger .nav-switch-btn {
  pointer-events: auto;
  transform: translate(-50%, 50%);
  opacity: 0.3;
}

.nav-switch-trigger.expanded .nav-switch-btn {
  transform: translate(0, 0);
  opacity: 1;
}

/* Sidebar Toggle Button Hover Effect */
.sidebar-container .toggle-btn {
  opacity: 0.4;
  transition:
    opacity 0.2s ease-in-out,
    background-color 0.2s ease-in-out;
}

.sidebar-container:hover .toggle-btn,
.toggle-btn:hover {
  opacity: 1;
}
</style>
