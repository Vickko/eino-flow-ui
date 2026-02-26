import { describe, expect, it } from 'vitest'
import { parseAgUiEventPayload, parseSseDataPayload } from '@/shared/api/sse/guards'

describe('sse guards', () => {
  it('parseAgUiEventPayload: 解析合法 RUN_STARTED', () => {
    const parsed = parseAgUiEventPayload(
      JSON.stringify({ type: 'RUN_STARTED', threadId: 't1', runId: 'r1' })
    )

    expect(parsed).toEqual({ type: 'RUN_STARTED', threadId: 't1', runId: 'r1' })
  })

  it('parseAgUiEventPayload: RUN_STARTED 缺 runId 仍可解析', () => {
    const parsed = parseAgUiEventPayload(JSON.stringify({ type: 'RUN_STARTED', threadId: 't1' }))
    expect(parsed).toEqual({ type: 'RUN_STARTED', threadId: 't1' })
  })

  it('parseAgUiEventPayload: RUN_FINISHED 缺 threadId 仍可解析', () => {
    const parsed = parseAgUiEventPayload(JSON.stringify({ type: 'RUN_FINISHED' }))
    expect(parsed).toEqual({ type: 'RUN_FINISHED' })
  })

  it('parseSseDataPayload: 解析合法 SSEData', () => {
    const parsed = parseSseDataPayload(
      JSON.stringify({
        type: 'data',
        content: {
          node_key: 'node_1',
          status: 'ok',
          input: { a: 1 },
          output: ['x', 'y'],
          metrics: { duration: 12 },
        },
      })
    )

    expect(parsed?.type).toBe('data')
    expect(parsed?.content.node_key).toBe('node_1')
  })

  it('parseSseDataPayload: 缺 node_key 时返回 null', () => {
    const parsed = parseSseDataPayload(JSON.stringify({ type: 'data', content: {} }))
    expect(parsed).toBeNull()
  })
})
