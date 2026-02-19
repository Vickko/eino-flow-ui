import {
  ApiClientError,
  createHttpStatusError,
  normalizeApiError,
  type ApiErrorKind,
} from '@/shared/api/errors'

export interface RequestPolicy {
  timeoutMs?: number
  retryCount?: number
  retryDelayMs?: number
  onUnauthorized?: () => void | Promise<void>
}

const DEFAULT_TIMEOUT_MS = 15000
const DEFAULT_RETRY_DELAY_MS = 250

const sleep = async (ms: number): Promise<void> => {
  if (ms <= 0) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}

const shouldRetry = (error: ApiClientError, attempt: number, retryCount: number): boolean => {
  if (attempt >= retryCount) return false
  if (!error.retryable) return false
  if (error.kind === 'abort') return false

  const retryableKinds: ApiErrorKind[] = ['network', 'timeout', 'http']
  return retryableKinds.includes(error.kind)
}

const runWithAbortAndTimeout = async <T>(
  task: (signal: AbortSignal) => Promise<T>,
  signal: AbortSignal | undefined,
  timeoutMs: number
): Promise<T> => {
  const controller = new AbortController()

  const onAbort = () => {
    controller.abort()
  }

  if (signal?.aborted) {
    controller.abort()
  } else {
    signal?.addEventListener('abort', onAbort, { once: true })
  }

  let timer: ReturnType<typeof setTimeout> | null = null
  let timedOut = false
  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
  }

  try {
    return await task(controller.signal)
  } catch (error) {
    if (timedOut) {
      throw new ApiClientError({
        kind: 'timeout',
        message: 'Request timeout',
        retryable: true,
        cause: error,
      })
    }
    throw error
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
    signal?.removeEventListener('abort', onAbort)
  }
}

const runWithPolicy = async <T>(
  task: (signal: AbortSignal) => Promise<T>,
  policy?: RequestPolicy,
  signal?: AbortSignal
): Promise<T> => {
  const retryCount = policy?.retryCount ?? 0
  const retryDelayMs = policy?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS
  const timeoutMs = policy?.timeoutMs ?? DEFAULT_TIMEOUT_MS

  let attempt = 0
  while (true) {
    try {
      return await runWithAbortAndTimeout(task, signal, timeoutMs)
    } catch (error) {
      const normalized = normalizeApiError(error)

      if (normalized.kind === 'unauthorized' && policy?.onUnauthorized) {
        await policy.onUnauthorized()
      }

      if (!shouldRetry(normalized, attempt, retryCount)) {
        throw normalized
      }

      attempt += 1
      await sleep(retryDelayMs * attempt)
    }
  }
}

export const requestWithPolicy = async <T>(
  task: (signal: AbortSignal) => Promise<T>,
  policy?: RequestPolicy,
  signal?: AbortSignal
): Promise<T> => {
  return runWithPolicy(task, policy, signal)
}

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  try {
    const text = await response.text()
    return text || null
  } catch {
    return null
  }
}

export interface FetchPolicy extends RequestPolicy {
  signal?: AbortSignal
}

export const fetchWithPolicy = async (
  input: RequestInfo | URL,
  init: RequestInit,
  policy?: FetchPolicy
): Promise<Response> => {
  return runWithPolicy(
    async (signal) => {
      const response = await fetch(input, {
        ...init,
        signal,
      })

      if (!response.ok) {
        const payload = await parseResponseBody(response)
        throw createHttpStatusError(response.status, response.statusText, payload)
      }

      return response
    },
    policy,
    policy?.signal
  )
}
