import { computed, onMounted, ref } from 'vue'
import { useTheme } from '@/shared/composables/useTheme'
import { useNavButton } from '@/shared/composables/useNavButton'
import { useChat } from '@/features/chat/composables/useChat'

export function useChatShell() {
  const {
    conversations,
    messages,
    activeConversationId,
    sendMessage,
    createConversation,
    selectConversation,
    loadSessions,
    isStreaming,
    stopStreaming,
  } = useChat()

  const { initTheme } = useTheme()
  const { isExpanded, handleMouseEnter, handleMouseLeave } = useNavButton()
  const showChatSidebar = ref(true)

  onMounted(() => {
    initTheme()
    loadSessions()
  })

  const activeConversation = computed(() =>
    conversations.value.find((conversation) => conversation.id === activeConversationId.value)
  )

  const currentMessages = computed(() => {
    if (!activeConversationId.value) return []
    return messages.value[activeConversationId.value] || []
  })

  const handleSelectConversation = (id: string) => {
    selectConversation(id)
  }

  const handleBack = () => {
    activeConversationId.value = null
  }

  const toggleSidebar = () => {
    showChatSidebar.value = !showChatSidebar.value
  }

  return {
    conversations,
    messages,
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
  }
}
