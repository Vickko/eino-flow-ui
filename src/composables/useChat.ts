import { ref } from 'vue';
import { sendChatMessage } from '@/api';
import type { ChatMessageResponse } from '@/types';

// 类型定义（保持与 useChatMock 兼容）
export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  status?: 'sending' | 'sent' | 'error';
  model?: string;
  reasoning_content?: string;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  unreadCount: number;
  lastMessage?: Message;
}

// 初始数据
const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    title: 'New Chat',
    updatedAt: Date.now(),
    unreadCount: 0,
  }
];

// 全局状态
const conversations = ref<Conversation[]>(INITIAL_CONVERSATIONS);
const messages = ref<Record<string, Message[]>>({ c1: [] });
const activeConversationId = ref<string | null>('c1');
const currentUser: User = {
  id: 'u1',
  name: 'Me',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
};

export function useChat() {

  const sendMessage = async (text: string, model?: string) => {
    if (!activeConversationId.value) return;

    const conversationId = activeConversationId.value;
    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      status: 'sending',
      model
    };

    // 添加用户消息
    if (!messages.value[conversationId]) {
      messages.value[conversationId] = [];
    }
    messages.value[conversationId].push(newMessage);

    // 更新会话最后一条消息
    const convIndex = conversations.value.findIndex(c => c.id === conversationId);
    if (convIndex !== -1) {
      const conv = conversations.value[convIndex];
      if (conv) {
        conv.lastMessage = newMessage;
        conv.updatedAt = Date.now();
        // 移到顶部
        conversations.value.splice(convIndex, 1);
        conversations.value.unshift(conv);
      }
    }

    try {
      // 标记为已发送
      newMessage.status = 'sent';

      // 调用真实 API
      const response: ChatMessageResponse = await sendChatMessage({
        session: conversationId, // 使用 conversationId 作为 session
        role: 'user',
        content: text,
        model: model
      });

      // 添加 AI 回复消息
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        conversationId,
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        status: 'sent',
        model: model || response.response_meta?.finish_reason,
        reasoning_content: response.reasoning_content
      };

      if (messages.value[conversationId]) {
        messages.value[conversationId].push(aiMessage);
      }

      // 再次更新会话最后一条消息
      const convIndex = conversations.value.findIndex(c => c.id === conversationId);
      if (convIndex !== -1) {
        const conv = conversations.value[convIndex];
        if (conv) {
          conv.lastMessage = aiMessage;
          conv.updatedAt = Date.now();

          // 如果是新会话的第一条消息，根据内容生成标题
          if (conv.title === 'New Chat') {
            conv.title = text.length > 30 ? text.substring(0, 30) + '...' : text;
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      newMessage.status = 'error';

      // 添加错误消息
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        conversationId,
        role: 'assistant',
        content: '抱歉，发送消息时出现错误。请稍后再试。',
        timestamp: Date.now(),
        status: 'error'
      };

      if (messages.value[conversationId]) {
        messages.value[conversationId].push(errorMessage);
      }
    }
  };

  const createConversation = () => {
    const newId = `c${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: 'New Chat',
      updatedAt: Date.now(),
      unreadCount: 0
    };
    conversations.value.unshift(newConv);
    messages.value[newId] = [];
    activeConversationId.value = newId;
  };

  return {
    conversations,
    messages,
    activeConversationId,
    currentUser,
    sendMessage,
    createConversation
  };
}
