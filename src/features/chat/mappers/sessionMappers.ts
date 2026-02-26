import type { Conversation, ImageAttachment, Message } from '@/features/chat/types'
import type { Session, SessionMessage } from '@/shared/types'

export const extractUserAttachments = (msg: SessionMessage): ImageAttachment[] => {
  const parts = msg.user_input_multi_content || []
  return parts
    .filter((part) => part.type === 'image_url' && !!part.image?.base64data)
    .map((part) => ({
      mimeType: part.image?.mime_type || 'image/png',
      data: part.image?.base64data || '',
    }))
    .filter((attachment) => attachment.data.length > 0)
}

export const extractAssistantImages = (msg: SessionMessage): string[] => {
  const parts = msg.assistant_output_multi_content || []
  return parts
    .filter((part) => part.type === 'image_url' && !!part.image?.base64data)
    .map((part) => part.image?.base64data || '')
    .filter((imageData) => imageData.length > 0)
}

export const buildSessionUserDisplayContent = (msg: SessionMessage): string => {
  const rawContent = msg.content || ''
  if (rawContent.trim().length > 0) return rawContent

  const textFromParts = (msg.user_input_multi_content || [])
    .filter((part) => part.type === 'text')
    .map((part) => part.text || '')
    .join('')
    .trim()
  if (textFromParts.length > 0) return textFromParts

  const imageCount = extractUserAttachments(msg).length
  if (imageCount > 0) {
    return `[已上传 ${imageCount} 张图片]`
  }
  return ''
}

// 后端 Session DTO -> 前端 Conversation ViewModel
export const sessionToConversation = (session: Session): Conversation => ({
  id: session.id, // 会话树 ID
  sessionId: session.last_active_session_id, // 用于 API 调用
  title: session.title,
  updatedAt: new Date(session.updated_at).getTime(),
  unreadCount: 0,
  lastMessage: session.last_message
    ? {
        id: `last-${session.id}`,
        conversationId: session.id,
        role: 'assistant',
        content: session.last_message,
        timestamp: new Date(session.updated_at).getTime(),
        status: 'sent',
      }
    : undefined,
})

// 后端 SessionMessage DTO -> 前端 Message ViewModel
export const sessionMessageToMessage = (
  msg: SessionMessage,
  conversationId: string,
  index: number
): Message => {
  const role = (msg.role === 'tool' ? 'assistant' : msg.role) as Message['role']
  const attachments = role === 'user' ? extractUserAttachments(msg) : []
  const assistantImages = role === 'assistant' ? extractAssistantImages(msg) : []
  const content = role === 'user' ? buildSessionUserDisplayContent(msg) : msg.content

  return {
    id: `${conversationId}-${index}`,
    conversationId,
    role,
    content,
    reasoning_content: msg.reasoning_content,
    reasoningStatus: msg.reasoning_content ? 'done' : undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
    images: assistantImages.length > 0 ? assistantImages : undefined,
    timestamp: Date.now() - (1000 - index), // 保持消息顺序
    status: 'sent',
    model: msg.model, // 传递模型信息（仅助手消息有值）
  }
}
