import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '@/features/chat/stores/chatStore'
import type { Message } from '@/features/chat/types'

describe('useChatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('hydrate 只会初始化一次，并根据消息状态计算 streaming', () => {
    const store = useChatStore()

    const streamingMessage: Message = {
      id: 'm-1',
      conversationId: 'c-1',
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'streaming',
    }

    store.hydrate(
      [
        {
          id: 'c-1',
          title: 'Chat 1',
          updatedAt: Date.now(),
          unreadCount: 0,
        },
      ],
      {
        'c-1': [streamingMessage],
      }
    )

    store.setActiveConversation('c-1')
    expect(store.isStreaming).toBe(true)

    store.hydrate([], {})
    expect(store.conversations).toHaveLength(1)
    expect(store.messages['c-1']).toHaveLength(1)
  })

  it('begin/complete/abort streaming request 生命周期正确', () => {
    const store = useChatStore()

    const first = store.beginStreamingRequest()
    expect(store.currentAbortController).toBe(first.controller)

    const second = store.beginStreamingRequest()
    expect(first.controller.signal.aborted).toBe(true)
    expect(store.currentAbortController).toBe(second.controller)

    store.completeStreamingRequest(first.requestId)
    expect(store.currentAbortController).toBe(second.controller)

    store.completeStreamingRequest(second.requestId)
    expect(store.currentAbortController).toBeNull()

    const third = store.beginStreamingRequest()
    expect(store.currentAbortController).toBe(third.controller)
    store.abortStreamingRequest()
    expect(third.controller.signal.aborted).toBe(true)
    expect(store.currentAbortController).toBeNull()
  })
})
