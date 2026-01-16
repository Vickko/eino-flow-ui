import axios, { type AxiosInstance } from 'axios'
import type {
  ApiResponse,
  GraphListResponse,
  GraphCanvasResponse,
  InputTypesResponse,
  DebugThreadResponse,
  DebugRunRequest,
  ChatMessageRequest,
  ChatMessageResponse,
  SessionListResponse,
  SessionMessagesResponse,
} from '@/types'

// 从环境变量读取 API 基础 URL
// 注意：使用 !== undefined 而不是 || 来允许空字符串作为有效值
const API_BASE = import.meta.env.VITE_API_BASE_URL !== undefined
  ? import.meta.env.VITE_API_BASE_URL
  : 'http://localhost:52538'
let API_BASE_DEVOPS = `${API_BASE}/eino/devops`
const CHAT_API_BASE = API_BASE

// 检查是否启用认证
const isAuthEnabled = import.meta.env.VITE_ENABLE_AUTH === 'true'

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
  API_BASE_DEVOPS = `${url}/eino/devops`
  apiClient.defaults.baseURL = API_BASE_DEVOPS
}

export const getBaseUrl = (): string => API_BASE_DEVOPS

// 添加 401 响应拦截器（仅在认证启用时）
if (isAuthEnabled) {
  // 动态导入 useAuth 避免循环依赖
  const handle401 = async (error: unknown) => {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number } }
      if (axiosError.response?.status === 401) {
        // 延迟导入 useAuth
        const { useAuth } = await import('@/composables/useAuth')
        const { login } = useAuth()
        login()
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
  onChunk?: (chunk: string) => void // 接收到 content 内容片段
  onReasoning?: (chunk: string) => void // 接收到 reasoning 思考内容片段
  onImage?: (base64data: string) => void // 接收到图片数据
  // 兼容：旧后端可能只返回 session
  onInfo?: (info: { session: string; tree_id?: string; is_new?: boolean }) => void // 接收到 info 事件（包含会话信息）
  onDone?: () => void // 流式输出完成
  onError?: (error: string) => void // 发生错误
}

export const streamChatMessage = async (
  request: ChatMessageRequest,
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
    // 跟踪当前事件类型：'reasoning' | 'content' | 'image' | null
    let currentEventType: string | null = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      // 保留最后一个可能不完整的行
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        // 处理事件类型
        if (trimmedLine.startsWith('event: ')) {
          const eventType = trimmedLine.slice(7)
          if (eventType === 'done') {
            callbacks.onDone?.()
            currentEventType = null
          } else if (eventType === 'error') {
            // 下一行会包含错误信息
            currentEventType = 'error'
          } else if (eventType === 'reasoning') {
            // 思考内容事件
            currentEventType = 'reasoning'
          } else if (eventType === 'content') {
            // 最终答案事件
            currentEventType = 'content'
          } else if (eventType === 'image') {
            // 图片数据事件
            currentEventType = 'image'
          } else if (eventType === 'info') {
            // 会话信息事件（包含后端生成的 session）
            currentEventType = 'info'
          }
          continue
        }

        // 处理数据
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6)
          if (data === '[DONE]') {
            callbacks.onDone?.()
          } else {
            // SSE data 字段是 JSON 字符串格式，需要解析还原原始内容
            try {
              if (currentEventType === 'image') {
                // 图片数据是 JSON 对象，包含 base64data 字段
                const imageData = JSON.parse(data) as { base64data: string }
                callbacks.onImage?.(imageData.base64data)
              } else if (currentEventType === 'info') {
                // info 数据是 JSON 对象：至少包含 session；可能还包含 tree_id, is_new
                const parsedInfo = JSON.parse(data) as unknown
                if (
                  typeof parsedInfo === 'object' &&
                  parsedInfo !== null &&
                  'session' in parsedInfo
                ) {
                  const infoData = parsedInfo as {
                    session: string
                    tree_id?: string
                    is_new?: boolean
                  }
                  callbacks.onInfo?.(infoData)
                }
              } else {
                const parsed = JSON.parse(data)
                // 根据当前事件类型调用相应的回调
                if (currentEventType === 'reasoning') {
                  callbacks.onReasoning?.(
                    typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
                  )
                } else {
                  // 默认为 content 或无事件类型时（兼容旧格式）
                  // 检查是否是 info 对象（后端可能没有发送 event: info 行）
                  if (typeof parsed === 'object' && parsed !== null && 'session' in parsed) {
                    callbacks.onInfo?.(
                      parsed as { session: string; tree_id?: string; is_new?: boolean }
                    )
                  } else {
                    callbacks.onChunk?.(
                      typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
                    )
                  }
                }
              }
            } catch {
              // 解析失败时直接使用原始数据
              if (currentEventType === 'reasoning') {
                callbacks.onReasoning?.(data)
              } else if (currentEventType !== 'image' && currentEventType !== 'info') {
                callbacks.onChunk?.(data)
              }
            }
          }
        }
      }
    }

    // 处理剩余的 buffer
    if (buffer.trim()) {
      const trimmedLine = buffer.trim()
      if (trimmedLine.startsWith('data: ')) {
        const data = trimmedLine.slice(6)
        if (data !== '[DONE]') {
          try {
            if (currentEventType === 'image') {
              const imageData = JSON.parse(data) as { base64data: string }
              callbacks.onImage?.(imageData.base64data)
            } else if (currentEventType === 'info') {
              const parsedInfo = JSON.parse(data) as unknown
              if (
                typeof parsedInfo === 'object' &&
                parsedInfo !== null &&
                'session' in parsedInfo
              ) {
                const infoData = parsedInfo as {
                  session: string
                  tree_id?: string
                  is_new?: boolean
                }
                callbacks.onInfo?.(infoData)
              }
            } else {
              const parsed = JSON.parse(data)
              if (currentEventType === 'reasoning') {
                callbacks.onReasoning?.(
                  typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
                )
              } else {
                // 检查是否是 info 对象
                if (typeof parsed === 'object' && parsed !== null && 'session' in parsed) {
                  callbacks.onInfo?.(
                    parsed as { session: string; tree_id?: string; is_new?: boolean }
                  )
                } else {
                  callbacks.onChunk?.(typeof parsed === 'string' ? parsed : JSON.stringify(parsed))
                }
              }
            }
          } catch {
            if (currentEventType === 'reasoning') {
              callbacks.onReasoning?.(data)
            } else if (currentEventType !== 'image' && currentEventType !== 'info') {
              callbacks.onChunk?.(data)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error streaming chat message:', error)
    callbacks.onError?.(error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

// 保留原有的非流式 API（用于兼容）
export const sendChatMessage = async (
  request: ChatMessageRequest
): Promise<ChatMessageResponse> => {
  try {
    const response = await chatApiClient.post<ChatMessageResponse>('/api/v1/chat', request)
    return response.data
  } catch (error) {
    console.error('Error sending chat message:', error)
    throw error
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
