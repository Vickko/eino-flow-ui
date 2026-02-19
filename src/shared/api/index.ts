import axios, { type AxiosInstance } from 'axios'
import type {
  AgUiEvent,
  ApiResponse,
  ChatMessageResponse,
  DebugRunRequest,
  DebugThreadResponse,
  GraphCanvasResponse,
  GraphListResponse,
  InputTypesResponse,
  RunAgentInput,
  SessionListResponse,
  SessionMessagesResponse,
} from '@/shared/types'

const DEVOPS_API_PREFIX = '/eino/devops'

// Users may provide either:
// - an origin:               "https://devops.vickko.com" or "http://localhost:52538"
// - a full DevOps base path: "https://devops.vickko.com/eino/devops"
// We normalize it to an origin so we do not accidentally create "/eino/devops/eino/devops/...".
export const normalizeDevopsApiOrigin = (input: string): string => {
  const raw = (input ?? '').trim()
  if (raw === '') return ''

  // Remove trailing slashes first.
  let s = raw.replace(/\/+$/, '')

  // If someone pasted the full DevOps base path, strip it back to the origin.
  if (s.endsWith(DEVOPS_API_PREFIX)) {
    s = s.slice(0, -DEVOPS_API_PREFIX.length)
  }

  // Remove trailing slashes again (in case origin ended with "/").
  return s.replace(/\/+$/, '')
}

// 从环境变量读取 API 基础 URL
// 注意：使用 !== undefined 而不是 || 来允许空字符串作为有效值
const API_BASE_ORIGIN =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? normalizeDevopsApiOrigin(import.meta.env.VITE_API_BASE_URL)
    : 'http://localhost:52538'
let API_BASE_DEVOPS = `${API_BASE_ORIGIN}${DEVOPS_API_PREFIX}`
const CHAT_API_BASE = API_BASE_ORIGIN

// 检查是否启用认证
const isAuthEnabled = import.meta.env.VITE_ENABLE_AUTH === 'true'
type UnauthorizedHandler = () => void | Promise<void>
let unauthorizedHandler: UnauthorizedHandler | null = null
let isHandlingUnauthorized = false

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_DEVOPS,
  withCredentials: isAuthEnabled, // 仅在认证启用时发送 cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

const chatApiClient: AxiosInstance = axios.create({
  baseURL: CHAT_API_BASE,
  withCredentials: isAuthEnabled, // 仅在认证启用时发送 cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

export const setBaseUrl = (url: string): void => {
  const origin = normalizeDevopsApiOrigin(url)
  API_BASE_DEVOPS = `${origin}${DEVOPS_API_PREFIX}`
  apiClient.defaults.baseURL = API_BASE_DEVOPS
}

export const getBaseUrl = (): string => API_BASE_DEVOPS
export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null): void => {
  unauthorizedHandler = handler
}

// 添加 401 响应拦截器（仅在认证启用时）
if (isAuthEnabled) {
  const handle401 = async (error: unknown) => {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number } }
      if (axiosError.response?.status === 401 && unauthorizedHandler && !isHandlingUnauthorized) {
        isHandlingUnauthorized = true
        try {
          await unauthorizedHandler()
        } catch (handlerError) {
          console.error('Error handling 401 unauthorized:', handlerError)
        } finally {
          isHandlingUnauthorized = false
        }
      }
    }
    return Promise.reject(error)
  }

  apiClient.interceptors.response.use((response) => response, handle401)
  chatApiClient.interceptors.response.use((response) => response, handle401)
}

export const ping = async (): Promise<ApiResponse> => {
  const response = await apiClient.get<ApiResponse>('/ping')
  return response.data
}

export const fetchGraphs = async (): Promise<ApiResponse<GraphListResponse>> => {
  try {
    const response = await apiClient.get<ApiResponse<GraphListResponse>>('/debug/v1/graphs')
    return response.data
  } catch (error) {
    console.error('Error fetching graphs:', error)
    throw error
  }
}

export const fetchGraphCanvas = async (
  graphId: string
): Promise<ApiResponse<GraphCanvasResponse>> => {
  try {
    const response = await apiClient.get<ApiResponse<GraphCanvasResponse>>(
      `/debug/v1/graphs/${graphId}/canvas`
    )
    return response.data
  } catch (error) {
    console.error(`Error fetching graph canvas for ${graphId}:`, error)
    throw error
  }
}

export const fetchInputTypes = async (): Promise<ApiResponse<InputTypesResponse>> => {
  try {
    const response = await apiClient.get<ApiResponse<InputTypesResponse>>('/debug/v1/input_types')
    return response.data
  } catch (error) {
    console.error('Error fetching input types:', error)
    throw error
  }
}

export const createDebugThread = async (
  graphId: string,
  input: Record<string, unknown>
): Promise<ApiResponse<DebugThreadResponse>> => {
  try {
    const response = await apiClient.post<ApiResponse<DebugThreadResponse>>(
      `/debug/v1/graphs/${graphId}/threads`,
      input
    )
    return response.data
  } catch (error) {
    console.error(`Error creating debug thread for ${graphId}:`, error)
    throw error
  }
}

export const streamDebugRun = async (
  graphId: string,
  threadId: string,
  input: DebugRunRequest,
  onChunk?: (chunk: string) => void
): Promise<void> => {
  try {
    const response = await fetch(
      `${API_BASE_DEVOPS}/debug/v1/graphs/${graphId}/threads/${threadId}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        ...(isAuthEnabled && { credentials: 'include' }), // 条件性添加
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      onChunk?.(chunk)
    }
  } catch (error) {
    console.error(`Error streaming debug run for ${graphId}/${threadId}:`, error)
    throw error
  }
}

// Chat API - SSE 流式接口
export interface StreamChatCallbacks {
  onEvent?: (event: AgUiEvent) => void // 接收到 AG-UI 事件
  onDone?: () => void // 收到 RUN_FINISHED / RUN_ERROR / [DONE]
  onError?: (error: string) => void // 发生错误
}

const isAgUiEvent = (value: unknown): value is AgUiEvent => {
  if (typeof value !== 'object' || value === null) return false
  if (!('type' in value)) return false
  return typeof (value as { type?: unknown }).type === 'string'
}

const parseSSEEventBlock = (
  block: string,
  callbacks: StreamChatCallbacks,
  notifyDone: () => void
): void => {
  const lines = block.split('\n')
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (dataLines.length === 0) return

  const payload = dataLines.join('\n').trim()
  if (!payload) return
  if (payload === '[DONE]') {
    notifyDone()
    return
  }

  try {
    const parsed = JSON.parse(payload) as unknown
    if (!isAgUiEvent(parsed)) return

    callbacks.onEvent?.(parsed)
    if (parsed.type === 'RUN_FINISHED' || parsed.type === 'RUN_ERROR') {
      notifyDone()
    }
  } catch {
    console.warn('Ignore invalid SSE event payload:', payload)
  }
}

export const streamChatMessage = async (
  request: RunAgentInput,
  callbacks: StreamChatCallbacks,
  abortSignal?: AbortSignal
): Promise<void> => {
  try {
    const response = await fetch(`${CHAT_API_BASE}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: abortSignal,
      ...(isAuthEnabled && { credentials: 'include' }), // 条件性添加
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let doneNotified = false
    const notifyDone = () => {
      if (doneNotified) return
      doneNotified = true
      callbacks.onDone?.()
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

      let eventSeparatorIndex = buffer.indexOf('\n\n')
      while (eventSeparatorIndex !== -1) {
        const eventBlock = buffer.slice(0, eventSeparatorIndex)
        buffer = buffer.slice(eventSeparatorIndex + 2)
        parseSSEEventBlock(eventBlock, callbacks, notifyDone)
        eventSeparatorIndex = buffer.indexOf('\n\n')
      }
    }

    if (buffer.trim()) {
      parseSSEEventBlock(buffer, callbacks, notifyDone)
    }

    if (!doneNotified) {
      throw new Error('Stream ended before completion event')
    }
  } catch (error) {
    console.error('Error streaming chat message:', error)
    callbacks.onError?.(error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

// 保留原有的非流式 API（用于兼容）
export const sendChatMessage = async (request: RunAgentInput): Promise<ChatMessageResponse> => {
  let content = ''
  let reasoningContent = ''
  let runErrorMessage = ''

  await streamChatMessage(request, {
    onEvent: (event) => {
      switch (event.type) {
        case 'TEXT_MESSAGE_DELTA':
          content += event.delta
          break
        case 'TEXT_MESSAGE_REASONING_DELTA':
          reasoningContent += event.delta
          break
        case 'RUN_ERROR':
          runErrorMessage = event.message
          break
      }
    },
  })

  if (runErrorMessage) {
    throw new Error(runErrorMessage)
  }

  return {
    role: 'assistant',
    content,
    reasoning_content: reasoningContent || undefined,
  }
}

// Session API - 获取会话列表
export const fetchSessions = async (): Promise<SessionListResponse> => {
  try {
    const response = await chatApiClient.get<SessionListResponse>('/api/v1/sessions')
    return response.data
  } catch (error) {
    console.error('Error fetching sessions:', error)
    throw error
  }
}

// Session API - 获取会话消息列表
export const fetchSessionMessages = async (sessionId: string): Promise<SessionMessagesResponse> => {
  try {
    const response = await chatApiClient.get<SessionMessagesResponse>(
      `/api/v1/sessions/${sessionId}`
    )
    return response.data
  } catch (error) {
    console.error(`Error fetching session messages for ${sessionId}:`, error)
    throw error
  }
}
