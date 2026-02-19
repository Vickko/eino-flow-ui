import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWithPolicy } from '@/shared/api/request'
import { streamSse } from '@/shared/api/sse/sseClient'

vi.mock('@/shared/api/request', () => ({
  fetchWithPolicy: vi.fn(),
}))

const createStreamResponse = (): Response => {
  const read = vi
    .fn()
    .mockResolvedValueOnce({ done: false, value: new Uint8Array([1]) })
    .mockResolvedValueOnce({ done: true, value: undefined })

  return {
    body: {
      getReader: () => ({ read }),
    },
  } as unknown as Response
}

describe('streamSse', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('会在读取结束后 flush 解码器并交给解析器处理', async () => {
    vi.mocked(fetchWithPolicy).mockResolvedValue(createStreamResponse())

    const decodeSpy = vi
      .spyOn(TextDecoder.prototype, 'decode')
      .mockReturnValueOnce('data: hel')
      .mockReturnValueOnce('lo\n\n')

    const onMessage = vi.fn()
    await streamSse('http://localhost/sse', {}, { onMessage })

    expect(decodeSpy).toHaveBeenCalledTimes(2)
    expect(decodeSpy.mock.calls[1]).toEqual([])
    expect(onMessage).toHaveBeenCalledWith({
      data: 'hello',
      event: undefined,
      id: undefined,
      retry: undefined,
    })
  })
})
