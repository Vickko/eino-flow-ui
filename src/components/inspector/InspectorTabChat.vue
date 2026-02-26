<script setup lang="ts">
import type { Message } from '@/features/chat'
import MessageBubble from '@/components/chat/MessageBubble.vue'

const props = defineProps<{
  hasExecutionResult: boolean
  messages: Message[]
}>()
</script>

<template>
  <div class="space-y-2">
    <div
      v-if="!props.hasExecutionResult"
      class="flex flex-col items-center justify-center text-muted-foreground py-8"
    >
      <svg class="w-8 h-8 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <p class="text-xs">No execution data available.</p>
      <p class="text-[10px] opacity-70 mt-1">Run the graph to see messages.</p>
    </div>

    <div
      v-else-if="props.messages.length === 0"
      class="flex flex-col items-center justify-center text-muted-foreground py-8"
    >
      <svg class="w-8 h-8 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <p class="text-xs">No messages available.</p>
    </div>

    <div v-else class="px-2">
      <MessageBubble
        v-for="msg in props.messages"
        :key="msg.id"
        :message="msg"
        :is-new="false"
        :hide-timestamp="true"
      />
    </div>
  </div>
</template>
