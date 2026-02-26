import { describe, expect, it } from 'vitest'
import {
  buildSessionUserDisplayContent,
  extractAssistantImages,
  extractUserAttachments,
  sessionMessageToMessage,
  sessionToConversation,
} from '@/features/chat/mappers/sessionMappers'

describe('sessionMappers', () => {
  it('extractUserAttachments: 只提取 base64 图片', () => {
    const attachments = extractUserAttachments({
      role: 'user',
      content: '',
      user_input_multi_content: [
        { type: 'text', text: 'hi' },
        { type: 'image_url', image: { base64data: 'AAA', mime_type: 'image/jpeg' } },
        { type: 'image_url', image: { base64data: '', mime_type: 'image/png' } },
      ],
    })

    expect(attachments).toEqual([{ mimeType: 'image/jpeg', data: 'AAA' }])
  })

  it('extractAssistantImages: 只提取 assistant_output_multi_content 中的图片', () => {
    const images = extractAssistantImages({
      role: 'assistant',
      content: '',
      assistant_output_multi_content: [
        { type: 'image_url', image: { base64data: 'IMG1', mime_type: 'image/png' } },
        { type: 'image_url', image: { base64data: '', mime_type: 'image/png' } },
      ],
    })

    expect(images).toEqual(['IMG1'])
  })

  it('buildSessionUserDisplayContent: 优先使用 msg.content', () => {
    const content = buildSessionUserDisplayContent({
      role: 'user',
      content: '  hello  ',
    })
    expect(content).toBe('  hello  ')
  })

  it('buildSessionUserDisplayContent: content 为空时使用 text parts', () => {
    const content = buildSessionUserDisplayContent({
      role: 'user',
      content: '   ',
      user_input_multi_content: [{ type: 'text', text: 'hi' }, { type: 'text', text: '!' }],
    })
    expect(content).toBe('hi!')
  })

  it('buildSessionUserDisplayContent: 只有图片时显示上传提示', () => {
    const content = buildSessionUserDisplayContent({
      role: 'user',
      content: '',
      user_input_multi_content: [
        { type: 'image_url', image: { base64data: 'IMG', mime_type: 'image/png' } },
      ],
    })
    expect(content).toBe('[已上传 1 张图片]')
  })

  it('sessionToConversation: 映射 sessionId/updatedAt/lastMessage', () => {
    const conv = sessionToConversation({
      id: 'tree_1',
      title: 't',
      last_active_session_id: 'session_1',
      last_message: 'last',
      created_at: '2026-02-26T00:00:00Z',
      updated_at: '2026-02-26T00:00:01Z',
    })

    expect(conv.id).toBe('tree_1')
    expect(conv.sessionId).toBe('session_1')
    expect(conv.lastMessage?.content).toBe('last')
  })

  it('sessionMessageToMessage: tool role 会被映射成 assistant', () => {
    const msg = sessionMessageToMessage(
      {
        role: 'tool',
        content: 'tool says',
      },
      'c1',
      0
    )

    expect(msg.role).toBe('assistant')
    expect(msg.content).toBe('tool says')
  })
})

