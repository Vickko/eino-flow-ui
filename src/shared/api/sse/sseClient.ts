import { fetchWithPolicy, type FetchPolicy } from '@/shared/api/request'
import { SseParser } from '@/shared/api/sse/parser'
import type { SseMessage } from '@/shared/api/sse/types'

export interface StreamSseOptions extends FetchPolicy {
  onChunk?: (chunk: string) => void
  onMessage?: (message: SseMessage) => void
  onComplete?: () => void
}

export const streamSse = async (
  url: string,
  init: RequestInit,
  options?: StreamSseOptions
): Promise<void> => {
  const response = await fetchWithPolicy(url, init, options)

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Response body is not readable')
  }

  const parser = new SseParser()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    options?.onChunk?.(chunk)

    const messages = parser.push(chunk)
    messages.forEach((message) => {
      options?.onMessage?.(message)
    })
  }

  const tailChunk = decoder.decode()
  if (tailChunk) {
    options?.onChunk?.(tailChunk)
    parser.push(tailChunk).forEach((message) => {
      options?.onMessage?.(message)
    })
  }

  parser.flush().forEach((message) => {
    options?.onMessage?.(message)
  })

  options?.onComplete?.()
}
