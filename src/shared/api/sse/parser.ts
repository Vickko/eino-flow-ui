import type { SseMessage } from '@/shared/api/sse/types'

const parseSseBlock = (block: string): SseMessage | null => {
  const lines = block.split('\n')

  let event: string | undefined
  let id: string | undefined
  let retry: number | undefined
  const dataLines: string[] = []

  for (const line of lines) {
    if (!line || line.startsWith(':')) continue

    const separatorIndex = line.indexOf(':')
    const field = separatorIndex >= 0 ? line.slice(0, separatorIndex) : line
    const rawValue = separatorIndex >= 0 ? line.slice(separatorIndex + 1) : ''
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

    switch (field) {
      case 'event':
        event = value
        break
      case 'id':
        id = value
        break
      case 'retry': {
        const parsed = Number.parseInt(value, 10)
        if (!Number.isNaN(parsed) && parsed >= 0) {
          retry = parsed
        }
        break
      }
      case 'data':
        dataLines.push(value)
        break
      default:
        break
    }
  }

  if (dataLines.length === 0 && !event) {
    return null
  }

  return {
    event,
    id,
    retry,
    data: dataLines.join('\n'),
  }
}

export class SseParser {
  private buffer = ''
  private pendingCarriageReturn = false

  private normalizeChunk(chunk: string): string {
    if (!chunk) return ''

    let normalized = ''
    let index = 0

    if (this.pendingCarriageReturn) {
      if (chunk[0] === '\n') {
        normalized += '\n'
        index = 1
      } else {
        normalized += '\n'
      }
      this.pendingCarriageReturn = false
    }

    for (; index < chunk.length; index += 1) {
      const char = chunk[index]
      if (char === '\r') {
        if (chunk[index + 1] === '\n') {
          normalized += '\n'
          index += 1
        } else if (index === chunk.length - 1) {
          this.pendingCarriageReturn = true
        } else {
          normalized += '\n'
        }
        continue
      }
      normalized += char
    }

    return normalized
  }

  push(chunk: string): SseMessage[] {
    this.buffer += this.normalizeChunk(chunk)

    const messages: SseMessage[] = []
    let separatorIndex = this.buffer.indexOf('\n\n')
    while (separatorIndex !== -1) {
      const block = this.buffer.slice(0, separatorIndex)
      this.buffer = this.buffer.slice(separatorIndex + 2)
      const parsed = parseSseBlock(block)
      if (parsed) {
        messages.push(parsed)
      }
      separatorIndex = this.buffer.indexOf('\n\n')
    }

    return messages
  }

  flush(): SseMessage[] {
    if (this.pendingCarriageReturn) {
      this.buffer += '\n'
      this.pendingCarriageReturn = false
    }

    if (!this.buffer.trim()) {
      this.buffer = ''
      return []
    }

    const parsed = parseSseBlock(this.buffer)
    this.buffer = ''
    return parsed ? [parsed] : []
  }
}
