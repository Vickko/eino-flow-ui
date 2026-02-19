import type {
  ApiResponse,
  DebugRunRequest,
  DebugThreadResponse,
  GraphCanvasResponse,
  GraphListResponse,
  InputTypesResponse,
  SSEData,
} from '@/shared/types'
import { apiClient, getBaseUrl, isAuthEnabled, notifyUnauthorized } from '@/shared/api/base'
import { createBusinessError } from '@/shared/api/errors'
import { requestWithPolicy } from '@/shared/api/request'
import { streamSse } from '@/shared/api/sse'

const ensureApiSuccess = <T>(response: ApiResponse<T>): ApiResponse<T> => {
  if (response.code !== 0) {
    throw createBusinessError(response.code, response.msg || 'Business request failed')
  }
  return response
}

export const fetchGraphs = async (): Promise<ApiResponse<GraphListResponse>> => {
  const data = await requestWithPolicy(
    async (signal) => {
      const response = await apiClient.get<ApiResponse<GraphListResponse>>('/debug/v1/graphs', {
        signal,
      })
      return response.data
    },
    {
      retryCount: 1,
      timeoutMs: 10000,
    }
  )
  return ensureApiSuccess(data)
}

export const fetchGraphCanvas = async (
  graphId: string
): Promise<ApiResponse<GraphCanvasResponse>> => {
  const data = await requestWithPolicy(
    async (signal) => {
      const response = await apiClient.get<ApiResponse<GraphCanvasResponse>>(
        `/debug/v1/graphs/${graphId}/canvas`,
        { signal }
      )
      return response.data
    },
    {
      retryCount: 1,
      timeoutMs: 10000,
    }
  )
  return ensureApiSuccess(data)
}

export const fetchInputTypes = async (): Promise<ApiResponse<InputTypesResponse>> => {
  const data = await requestWithPolicy(
    async (signal) => {
      const response = await apiClient.get<ApiResponse<InputTypesResponse>>('/debug/v1/input_types', {
        signal,
      })
      return response.data
    },
    {
      retryCount: 1,
      timeoutMs: 10000,
    }
  )
  return ensureApiSuccess(data)
}

export const createDebugThread = async (
  graphId: string,
  input: Record<string, unknown>
): Promise<ApiResponse<DebugThreadResponse>> => {
  const data = await requestWithPolicy(
    async (signal) => {
      const response = await apiClient.post<ApiResponse<DebugThreadResponse>>(
        `/debug/v1/graphs/${graphId}/threads`,
        input,
        { signal }
      )
      return response.data
    },
    {
      retryCount: 0,
      timeoutMs: 15000,
    }
  )
  return ensureApiSuccess(data)
}

const parseDebugSseData = (payload: string): SSEData | null => {
  if (!payload.trim()) return null
  try {
    return JSON.parse(payload) as SSEData
  } catch {
    return null
  }
}

export interface DebugStreamCallbacks {
  onChunk?: (chunk: string) => void
  onEvent?: (event: SSEData) => void
}

export const streamDebugRun = async (
  graphId: string,
  threadId: string,
  input: DebugRunRequest,
  callbacks?: DebugStreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> => {
  await streamSse(
    `${getBaseUrl()}/debug/v1/graphs/${graphId}/threads/${threadId}/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      ...(isAuthEnabled && { credentials: 'include' }),
    },
    {
      signal: abortSignal,
      retryCount: 0,
      timeoutMs: 0,
      onUnauthorized: notifyUnauthorized,
      onChunk: callbacks?.onChunk,
      onMessage: (message) => {
        const parsed = parseDebugSseData(message.data)
        if (parsed) {
          callbacks?.onEvent?.(parsed)
        }
      },
    }
  )
}
