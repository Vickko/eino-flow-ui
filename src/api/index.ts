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

export const fetchGraphCanvas = async (graphId: string): Promise<ApiResponse<GraphCanvasResponse>> => {
  try {
    const response = await apiClient.get<ApiResponse<GraphCanvasResponse>>(`/debug/v1/graphs/${graphId}/canvas`)
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

// Chat API
export const sendChatMessage = async (
  request: ChatMessageRequest
): Promise<ChatMessageResponse> => {
  try {
    const response = await chatApiClient.post<ChatMessageResponse>(
      '/api/v1/chat',
      request
    )
    return response.data
  } catch (error) {
    console.error('Error sending chat message:', error)
    throw error
  }
}

