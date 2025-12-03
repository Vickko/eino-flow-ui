import { ref } from 'vue';

// 类型定义
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
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  unreadCount: number;
  lastMessage?: Message;
}

// Mock Data
const MOCK_USERS: Record<string, User> = {
  u1: { id: 'u1', name: 'Me', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
  ai1: { id: 'ai1', name: 'GPT-4', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=GPT4' },
  ai2: { id: 'ai2', name: 'Claude 3', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Claude' },
};

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    title: 'Project Planning',
    updatedAt: Date.now(),
    unreadCount: 0,
    lastMessage: {
      id: 'm1',
      conversationId: 'c1',
      role: 'assistant',
      content: 'Sure, let\'s discuss the project roadmap.',
      timestamp: Date.now(),
      status: 'sent'
    }
  },
  {
    id: 'c2',
    title: 'Code Review',
    updatedAt: Date.now() - 86400000,
    unreadCount: 2,
    lastMessage: {
      id: 'm2',
      conversationId: 'c2',
      role: 'assistant',
      content: 'I found a few issues in the PR.',
      timestamp: Date.now() - 86400000,
      status: 'sent'
    }
  }
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  c1: [
    {
      id: 'm0',
      conversationId: 'c1',
      role: 'user',
      content: 'Hi, can we talk about the new feature?',
      timestamp: Date.now() - 60000,
      status: 'sent'
    },
    {
      id: 'm1',
      conversationId: 'c1',
      role: 'assistant',
      content: 'Sure, let\'s discuss the project roadmap.',
      timestamp: Date.now(),
      status: 'sent'
    }
  ],
  c2: [
    {
      id: 'm2',
      conversationId: 'c2',
      role: 'assistant',
      content: 'I found a few issues in the PR.',
      timestamp: Date.now() - 86400000,
      status: 'sent'
    }
  ]
};

// Global state (singleton pattern for simplicity in this mock)
const conversations = ref<Conversation[]>(INITIAL_CONVERSATIONS);
const messages = ref<Record<string, Message[]>>(INITIAL_MESSAGES);
const activeConversationId = ref<string | null>('c1');
const currentUser = MOCK_USERS.u1;

export function useChatMock() {
  
  const sendMessage = async (text: string) => {
    if (!activeConversationId.value) return;
    
    const conversationId = activeConversationId.value;
    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      status: 'sending'
    };

    // Add user message
    if (!messages.value[conversationId]) {
      messages.value[conversationId] = [];
    }
    messages.value[conversationId].push(newMessage);
    
    // Update conversation last message
    const convIndex = conversations.value.findIndex(c => c.id === conversationId);
    if (convIndex !== -1) {
      const conv = conversations.value[convIndex];
      if (conv) {
        conv.lastMessage = newMessage;
        conv.updatedAt = Date.now();
        // Move to top
        conversations.value.splice(convIndex, 1);
        conversations.value.unshift(conv);
      }
    }

    // Simulate network delay
    setTimeout(() => {
      newMessage.status = 'sent';
      
      // Simulate AI typing
      setTimeout(() => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          conversationId,
          role: 'assistant',
          content: `I received your message: "${text}". This is a mock response.`,
          timestamp: Date.now(),
          status: 'sent'
        };
        
        if (messages.value[conversationId]) {
          messages.value[conversationId].push(aiMessage);
        }
        
        // Update conversation last message again
        const convIndex = conversations.value.findIndex(c => c.id === conversationId);
        if (convIndex !== -1) {
          const conv = conversations.value[convIndex];
          if (conv) {
            conv.lastMessage = aiMessage;
            conv.updatedAt = Date.now();
          }
        }
      }, 1000);
    }, 500);
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