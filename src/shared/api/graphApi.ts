import type {
  ApiResponse,
  DebugRunRequest,
  DebugThreadResponse,
  GraphCanvasResponse,
  GraphListResponse,
  InputTypesResponse,
} from '@/shared/types'
import { apiClient, getBaseUrl, isAuthEnabled } from '@/shared/api/base'

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
      `${getBaseUrl()}/debug/v1/graphs/${graphId}/threads/${threadId}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        ...(isAuthEnabled && { credentials: 'include' }),
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
