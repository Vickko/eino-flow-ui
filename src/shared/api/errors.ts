import axios from 'axios'

export type ApiErrorKind =
  | 'business'
  | 'network'
  | 'timeout'
  | 'abort'
  | 'unauthorized'
  | 'http'
  | 'unknown'

export interface ApiClientErrorInit {
  kind: ApiErrorKind
  message: string
  status?: number
  code?: string | number
  retryable?: boolean
  cause?: unknown
}

export class ApiClientError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly code?: string | number
  readonly retryable: boolean
  readonly cause?: unknown

  constructor(init: ApiClientErrorInit) {
    super(init.message)
    this.name = 'ApiClientError'
    this.kind = init.kind
    this.status = init.status
    this.code = init.code
    this.retryable = init.retryable ?? false
    this.cause = init.cause
  }
}

const readErrorMessage = (input: unknown): string | undefined => {
  if (!input || typeof input !== 'object') return undefined
  const value = input as Record<string, unknown>
  if (typeof value.msg === 'string' && value.msg.trim().length > 0) return value.msg
  if (typeof value.message === 'string' && value.message.trim().length > 0) return value.message
  if (typeof value.error === 'string' && value.error.trim().length > 0) return value.error
  return undefined
}

export const createBusinessError = (code: number, message?: string): ApiClientError => {
  return new ApiClientError({
    kind: 'business',
    message: message || `Business error: ${code}`,
    code,
    retryable: false,
  })
}

export const createHttpStatusError = (
  status: number,
  statusText: string,
  payload?: unknown
): ApiClientError => {
  const payloadMessage = readErrorMessage(payload)

  if (status === 401) {
    return new ApiClientError({
      kind: 'unauthorized',
      status,
      message: payloadMessage || 'Unauthorized',
      retryable: false,
      cause: payload,
    })
  }

  return new ApiClientError({
    kind: 'http',
    status,
    message: payloadMessage || statusText || `HTTP ${status}`,
    retryable: status === 429 || status >= 500,
    cause: payload,
  })
}

export const normalizeApiError = (
  error: unknown,
  fallbackMessage = 'Request failed'
): ApiClientError => {
  if (error instanceof ApiClientError) {
    return error
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new ApiClientError({
      kind: 'abort',
      message: 'Request aborted',
      retryable: false,
      cause: error,
    })
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const payload = error.response?.data

    if (error.code === 'ECONNABORTED') {
      return new ApiClientError({
        kind: 'timeout',
        message: 'Request timeout',
        status,
        code: error.code,
        retryable: true,
        cause: error,
      })
    }

    if (status !== undefined) {
      return createHttpStatusError(status, error.message, payload)
    }

    return new ApiClientError({
      kind: 'network',
      message: error.message || 'Network error',
      code: error.code,
      retryable: true,
      cause: error,
    })
  }

  if (error instanceof TypeError) {
    return new ApiClientError({
      kind: 'network',
      message: error.message || 'Network error',
      retryable: true,
      cause: error,
    })
  }

  if (error instanceof Error) {
    return new ApiClientError({
      kind: 'unknown',
      message: error.message || fallbackMessage,
      retryable: false,
      cause: error,
    })
  }

  return new ApiClientError({
    kind: 'unknown',
    message: fallbackMessage,
    retryable: false,
    cause: error,
  })
}

export const isApiClientError = (error: unknown): error is ApiClientError =>
  error instanceof ApiClientError
