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
  const activeAbortRequestId = ref(0)
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
    activeAbortRequestId.value += 1
  }

  const beginStreamingRequest = (): { requestId: number; controller: AbortController } => {
    if (currentAbortController.value) {
      currentAbortController.value.abort()
    }
    const controller = new AbortController()
    currentAbortController.value = controller
    activeAbortRequestId.value += 1
    return {
      requestId: activeAbortRequestId.value,
      controller,
    }
  }

  const completeStreamingRequest = (requestId: number): void => {
    if (activeAbortRequestId.value !== requestId) return
    currentAbortController.value = null
  }

  const abortStreamingRequest = (): void => {
    if (currentAbortController.value) {
      currentAbortController.value.abort()
      currentAbortController.value = null
    }
    activeAbortRequestId.value += 1
  }

  const reset = (): void => {
    if (currentAbortController.value) {
      currentAbortController.value.abort()
    }
    conversations.value = []
    messages.value = {}
    activeConversationId.value = null
    isLoadingSessions.value = false
    isLoadingMessages.value = false
    currentAbortController.value = null
    activeAbortRequestId.value = 0
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
    beginStreamingRequest,
    completeStreamingRequest,
    abortStreamingRequest,
    reset,
  }
})
