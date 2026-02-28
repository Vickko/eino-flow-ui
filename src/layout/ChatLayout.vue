<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useChatShell } from '@/features/chat'
import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import ChatCard from '@/components/chat/ChatCard.vue'

const {
  conversations,
  messages,
  activeConversationId,
  sendMessage,
  createConversation,
  isStreaming,
  stopStreaming,
  showChatSidebar,
  handleSelectConversation,
  handleBack,
  toggleSidebar,
} = useChatShell()

const isMobile = ref(false)

onMounted(() => {
  const mql = window.matchMedia('(max-width: 767.98px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', (e) => {
    isMobile.value = e.matches
  })
})

// Delayed collapsed state: on mobile back-navigation the slide panel needs time to
// move into view before the sidebar content enter-animations fire. Without the delay
// the animations complete while the panel is still off-screen and appear invisible.
const sidebarCollapsed = ref(false)
let collapseTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => activeConversationId.value !== null && (isMobile.value || !showChatSidebar.value),
  (shouldCollapse, wasPrevCollapsed) => {
    if (collapseTimer !== undefined) {
      clearTimeout(collapseTimer)
      collapseTimer = undefined
    }
    if (shouldCollapse) {
      sidebarCollapsed.value = true
    } else if (wasPrevCollapsed && isMobile.value) {
      collapseTimer = setTimeout(() => {
        sidebarCollapsed.value = false
      }, 150)
    } else {
      sidebarCollapsed.value = false
    }
  },
  { immediate: true }
)

// Delayed display state: keeps chat content visible during slide-out animation.
// When opening a chat, displayedConversationId updates immediately.
// When going back, it stays set until the slide animation finishes,
// so the ChatCard remains rendered with its messages during the transition.
const displayedConversationId = ref<string | null>(null)

watch(activeConversationId, (newId) => {
  if (newId !== null) {
    displayedConversationId.value = newId
  } else {
    // Fallback: clear after transition duration in case transitionend doesn't fire (e.g. desktop)
    setTimeout(() => {
      if (activeConversationId.value === null) {
        displayedConversationId.value = null
      }
    }, 350)
  }
})

const displayedConversation = computed(() =>
  conversations.value.find((c) => c.id === displayedConversationId.value)
)

const displayedMessages = computed(() => {
  if (!displayedConversationId.value) return []
  return messages.value[displayedConversationId.value] || []
})

const onSlideTransitionEnd = (e: TransitionEvent) => {
  if (e.propertyName !== 'transform') return
  if (activeConversationId.value === null) {
    displayedConversationId.value = null
  }
}
</script>

<template>
  <div class="h-dvh w-full overflow-hidden bg-background text-foreground">
    <!-- Slide track: on mobile both panels are full-width side by side, translateX slides between them.
         On desktop (md+), translate is always 0 and transition is disabled so this is a normal flex row. -->
    <div
      class="flex h-full transition-transform duration-300 ease-in-out md:transition-none md:!translate-x-0"
      :class="activeConversationId ? '-translate-x-full' : ''"
      @transitionend.self="onSlideTransitionEnd"
    >
      <!-- Sidebar -->
      <div
        class="w-full shrink-0 h-full border-r border-border/40 bg-background/50 backdrop-blur-xl transition-[width] duration-300 relative sidebar-container z-30 flex"
        :class="[activeConversationId ? (showChatSidebar ? 'md:w-80' : 'md:w-20') : '']"
      >
        <ChatSidebar
          class="w-full"
          :conversations="conversations"
          :active-id="activeConversationId"
          :collapsed="sidebarCollapsed"
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
      <div class="w-full shrink-0 md:flex-1 min-h-0 flex flex-col h-full relative p-3">
        <template v-if="displayedConversationId">
          <ChatCard
            :messages="displayedMessages"
            :conversation-title="displayedConversation?.title"
            :is-streaming="isStreaming"
            class="w-full h-full"
            @send="
              ({ text, model, thinking, attachments }) =>
                sendMessage(text, model, thinking, attachments)
            "
            @stop="stopStreaming"
            @back="handleBack"
          />
        </template>

        <div
          v-if="!activeConversationId && !displayedConversationId"
          class="hidden md:flex flex-1 items-center justify-center text-muted-foreground rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-panel"
        >
          <div class="text-center">
            <h3 class="text-lg font-medium">Welcome to Chat</h3>
            <p class="text-sm opacity-70">Select a conversation to start messaging</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
