import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Conversation, Message } from '@/features/chat/types'

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>([])
  const messages = ref<Record<string, Message[]>>({})
  const activeConversationId = ref<string | null>(null)
  const isLoadingSessions = ref(false)
  const isLoadingMessages = ref(false)
  const currentAbortController = ref<AbortController | null>(null)
  const isHydrated = ref(false)

  const isStreaming = computed(() => {
    if (!activeConversationId.value) return false
    const messageList = messages.value[activeConversationId.value]
    return messageList?.some((message) => message.status === 'streaming') ?? false
  })

  const hydrate = (
    initialConversations: Conversation[],
    initialMessages: Record<string, Message[]>
  ): void => {
    if (isHydrated.value) return
    conversations.value = initialConversations
    messages.value = initialMessages
    isHydrated.value = true
  }

  const setConversations = (nextConversations: Conversation[]): void => {
    conversations.value = nextConversations
  }

  const setConversationMessages = (conversationId: string, nextMessages: Message[]): void => {
    messages.value = {
      ...messages.value,
      [conversationId]: nextMessages,
    }
  }

  const setActiveConversation = (conversationId: string | null): void => {
    activeConversationId.value = conversationId
  }

  const setLoadingSessions = (loading: boolean): void => {
    isLoadingSessions.value = loading
  }

  const setLoadingMessages = (loading: boolean): void => {
    isLoadingMessages.value = loading
  }

  const setCurrentAbortController = (controller: AbortController | null): void => {
    currentAbortController.value = controller
  }

  const reset = (): void => {
    conversations.value = []
    messages.value = {}
    activeConversationId.value = null
    isLoadingSessions.value = false
    isLoadingMessages.value = false
    currentAbortController.value = null
    isHydrated.value = false
  }

  return {
    conversations,
    messages,
    activeConversationId,
    isLoadingSessions,
    isLoadingMessages,
    currentAbortController,
    isStreaming,
    hydrate,
    setConversations,
    setConversationMessages,
    setActiveConversation,
    setLoadingSessions,
    setLoadingMessages,
    setCurrentAbortController,
    reset,
  }
})
