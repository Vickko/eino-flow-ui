import { describe, expect, it } from 'vitest'
import { SseParser } from '@/shared/api/sse/parser'

describe('SseParser', () => {
  it('支持分片输入并正确合并事件', () => {
    const parser = new SseParser()

    const first = parser.push('data: {"a":1}\n\nda')
    expect(first).toEqual([{ data: '{"a":1}', event: undefined, id: undefined, retry: undefined }])

    const second = parser.push('ta: {"b":2}\n\n')
    expect(second).toEqual([{ data: '{"b":2}', event: undefined, id: undefined, retry: undefined }])
  })

  it('CRLF 被分片时不会被误判为空行', () => {
    const parser = new SseParser()

    expect(parser.push('data: hello\r')).toEqual([])
    expect(parser.push('\ndata: world\r')).toEqual([])
    expect(parser.push('\n\r\n')).toEqual([
      {
        data: 'hello\nworld',
        event: undefined,
        id: undefined,
        retry: undefined,
      },
    ])
  })

  it('支持多行 data 和 event/id/retry 字段', () => {
    const parser = new SseParser()

    const messages = parser.push('event: custom\nid: 3\nretry: 5000\ndata: line1\ndata: line2\n\n')
    expect(messages).toEqual([
      {
        event: 'custom',
        id: '3',
        retry: 5000,
        data: 'line1\nline2',
      },
    ])
  })

  it('flush 会处理缓冲区中最后一个未终止事件', () => {
    const parser = new SseParser()
    parser.push('data: final')

    expect(parser.flush()).toEqual([
      {
        data: 'final',
        event: undefined,
        id: undefined,
        retry: undefined,
      },
    ])
  })
})
