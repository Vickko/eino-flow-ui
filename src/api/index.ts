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
} from '@/types'

let API_BASE = 'http://localhost:52538/eino/devops'
const CHAT_API_BASE = 'http://localhost:52538'

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

const chatApiClient: AxiosInstance = axios.create({
  baseURL: CHAT_API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const setBaseUrl = (url: string): void => {
  API_BASE = url
  apiClient.defaults.baseURL = url
}

export const getBaseUrl = (): string => API_BASE

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
      `${API_BASE}/debug/v1/graphs/${graphId}/threads/${threadId}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
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
  onDone?: () => void // 流式输出完成
  onError?: (error: string) => void // 发生错误
}

export const streamChatMessage = async (
  request: ChatMessageRequest,
  callbacks: StreamChatCallbacks
): Promise<void> => {
  try {
    const response = await fetch(`${CHAT_API_BASE}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
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
              } else {
                const parsed = JSON.parse(data) as string
                // 根据当前事件类型调用相应的回调
                if (currentEventType === 'reasoning') {
                  callbacks.onReasoning?.(parsed)
                } else {
                  // 默认为 content 或无事件类型时（兼容旧格式）
                  callbacks.onChunk?.(parsed)
                }
              }
            } catch {
              // 解析失败时直接使用原始数据
              if (currentEventType === 'reasoning') {
                callbacks.onReasoning?.(data)
              } else if (currentEventType !== 'image') {
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
            } else {
              const parsed = JSON.parse(data) as string
              if (currentEventType === 'reasoning') {
                callbacks.onReasoning?.(parsed)
              } else {
                callbacks.onChunk?.(parsed)
              }
            }
          } catch {
            if (currentEventType === 'reasoning') {
              callbacks.onReasoning?.(data)
            } else if (currentEventType !== 'image') {
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
