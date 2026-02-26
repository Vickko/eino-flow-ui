import type { JsonValue } from '@/shared/types'

export interface User {
  id: string
  name: string
  avatar: string
}

export interface ImageAttachment {
  mimeType: string
  data: string
  name?: string
}

export interface ToolCallState {
  id: string
  name: string
  args?: JsonValue
  status: 'running' | 'done' | 'error'
  error?: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  status?: 'sending' | 'sent' | 'error' | 'streaming'
  model?: string
  reasoning_content?: string
  reasoningStatus?: 'thinking' | 'done'
  images?: string[]
  attachments?: ImageAttachment[]
  tool_calls?: ToolCallState[]
}

export interface Conversation {
  id: string
  sessionId?: string
  title: string
  updatedAt: number
  unreadCount: number
  lastMessage?: Message
}
