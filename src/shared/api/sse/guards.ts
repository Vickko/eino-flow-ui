import type { AgUiEvent, ChatMessageRole, JsonValue, SSEData } from '@/shared/types'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === 'string'

const isChatMessageRole = (value: unknown): value is ChatMessageRole =>
  value === 'user' || value === 'system' || value === 'assistant' || value === 'tool'

// 运行时校验：目标是“不影响业务逻辑”。
//
// 说明：
// - 我们只做浅层判断：JSON.parse 的结果天然不会出现函数/Date/BigInt 等不可序列化类型。
// - 不做深度/键数/数组长度限制，避免大 payload 被误判为非法从而静默丢事件。
const isJsonValue = (value: unknown): value is JsonValue =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  Array.isArray(value) ||
  isPlainObject(value)

export type ParseInvalidKind = 'empty' | 'json_parse_failed' | 'schema_mismatch'
export interface ParseInvalidInfo {
  kind: ParseInvalidKind
  payload: string
}

export const isAgUiEvent = (value: unknown): value is AgUiEvent => {
  if (!isPlainObject(value)) return false
  if (!isString(value.type)) return false

  switch (value.type) {
    case 'RUN_STARTED':
      return isString(value.threadId) && isOptionalString(value.runId)
    case 'RUN_FINISHED':
      return isOptionalString(value.threadId) && isOptionalString(value.runId)
    case 'RUN_ERROR':
      return isString(value.message) && isOptionalString(value.code)
    case 'TEXT_MESSAGE_START':
      return (
        isString(value.messageId) &&
        isChatMessageRole(value.role) &&
        isOptionalString(value.parentMessageId)
      )
    case 'TEXT_MESSAGE_DELTA':
      return isString(value.messageId) && isString(value.delta)
    case 'TEXT_MESSAGE_END':
      return isString(value.messageId)
    case 'TEXT_MESSAGE_REASONING_START':
      return isString(value.messageId)
    case 'TEXT_MESSAGE_REASONING_DELTA':
      return isString(value.messageId) && isString(value.delta)
    case 'TEXT_MESSAGE_REASONING_END':
      return isString(value.messageId)
    case 'TOOL_CALL_START':
      return (
        isString(value.toolCallId) &&
        isOptionalString(value.toolCallName) &&
        isOptionalString(value.parentMessageId)
      )
    case 'TOOL_CALL_ARGS':
      return (
        isString(value.toolCallId) &&
        'args' in value &&
        isJsonValue(value.args) &&
        isOptionalString(value.parentMessageId)
      )
    case 'TOOL_CALL_END':
      return (
        isString(value.toolCallId) &&
        isOptionalString(value.toolCallName) &&
        isOptionalString(value.parentMessageId)
      )
    default:
      return false
  }
}

export const parseAgUiEventPayload = (
  payload: string,
  onInvalid?: (info: ParseInvalidInfo) => void
): AgUiEvent | null => {
  const trimmed = payload.trim()
  if (!trimmed) {
    onInvalid?.({ kind: 'empty', payload })
    return null
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (isAgUiEvent(parsed)) return parsed
    onInvalid?.({ kind: 'schema_mismatch', payload })
    return null
  } catch {
    onInvalid?.({ kind: 'json_parse_failed', payload })
    return null
  }
}

export const isSseData = (value: unknown): value is SSEData => {
  if (!isPlainObject(value)) return false
  if (!isString(value.type)) return false
  if (!isPlainObject(value.content)) return false
  if (!isString(value.content.node_key)) return false

  if (value.content.status !== undefined && !isString(value.content.status)) return false
  if (value.content.input !== undefined && !isJsonValue(value.content.input)) return false
  if (value.content.output !== undefined && !isJsonValue(value.content.output)) return false
  if (value.content.error !== undefined && !isJsonValue(value.content.error)) return false

  if (value.content.metrics !== undefined) {
    if (!isPlainObject(value.content.metrics)) return false
    if (
      value.content.metrics.duration !== undefined &&
      typeof value.content.metrics.duration !== 'number'
    ) {
      return false
    }
  }

  return true
}

export const parseSseDataPayload = (
  payload: string,
  onInvalid?: (info: ParseInvalidInfo) => void
): SSEData | null => {
  const trimmed = payload.trim()
  if (!trimmed) {
    onInvalid?.({ kind: 'empty', payload })
    return null
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (isSseData(parsed)) return parsed
    onInvalid?.({ kind: 'schema_mismatch', payload })
    return null
  } catch {
    onInvalid?.({ kind: 'json_parse_failed', payload })
    return null
  }
}
