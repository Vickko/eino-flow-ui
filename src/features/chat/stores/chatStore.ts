import { ref } from 'vue'
import { defineStore } from 'pinia'

type ChatMessageLike = Record<string, unknown>
type ConversationLike = { id: string } & Record<string, unknown>

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<ConversationLike[]>([])
  const messages = ref<Record<string, ChatMessageLike[]>>({})
  const activeConversationId = ref<string | null>(null)
  const isStreaming = ref(false)

  const setConversations = (nextConversations: ConversationLike[]): void => {
    conversations.value = nextConversations
  }

  const setConversationMessages = (conversationId: string, nextMessages: ChatMessageLike[]): void => {
    messages.value = {
      ...messages.value,
      [conversationId]: nextMessages,
    }
  }

  const setActiveConversation = (conversationId: string | null): void => {
    activeConversationId.value = conversationId
  }

  const setStreaming = (streaming: boolean): void => {
    isStreaming.value = streaming
  }

  const reset = (): void => {
    conversations.value = []
    messages.value = {}
    activeConversationId.value = null
    isStreaming.value = false
  }

  return {
    conversations,
    messages,
    activeConversationId,
    isStreaming,
    setConversations,
    setConversationMessages,
    setActiveConversation,
    setStreaming,
    reset,
  }
})
