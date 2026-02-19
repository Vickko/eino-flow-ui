import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '@/shared/api/errors'
import { fetchWithPolicy, requestWithPolicy } from '@/shared/api/request'

describe('api request policy', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('requestWithPolicy 会在网络错误时重试', async () => {
    const task = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiClientError({
          kind: 'network',
          message: 'network down',
          retryable: true,
        })
      )
      .mockResolvedValueOnce('ok')

    const result = await requestWithPolicy(
      async (signal) => task(signal),
      {
        retryCount: 1,
        retryDelayMs: 1,
        timeoutMs: 1000,
      }
    )

    expect(result).toBe('ok')
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('requestWithPolicy 会在超时时返回 timeout 错误', async () => {
    vi.useFakeTimers()

    const pendingPromise = requestWithPolicy(
      async (signal) => {
        await new Promise((_, reject) => {
          signal.addEventListener(
            'abort',
            () => {
              const abortError = new Error('aborted')
              abortError.name = 'AbortError'
              reject(abortError)
            },
            { once: true }
          )
        })
        return 'done'
      },
      {
        retryCount: 0,
        timeoutMs: 10,
      }
    )

    const assertion = expect(pendingPromise).rejects.toMatchObject({
      kind: 'timeout',
    })

    await vi.advanceTimersByTimeAsync(20)
    await assertion
  })

  it('fetchWithPolicy 在 401 时触发 unauthorized 回调', async () => {
    const unauthorizedSpy = vi.fn()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ msg: 'not logged in' }), {
        status: 401,
        headers: {
          'content-type': 'application/json',
        },
      })
    )

    await expect(
      fetchWithPolicy(
        'http://localhost/test',
        { method: 'GET' },
        {
          retryCount: 0,
          timeoutMs: 1000,
          onUnauthorized: unauthorizedSpy,
        }
      )
    ).rejects.toMatchObject({
      kind: 'unauthorized',
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(unauthorizedSpy).toHaveBeenCalledTimes(1)
  })

  it('fetchWithPolicy 在 5xx 时重试并成功返回', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response('temporary unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
        })
      )
      .mockResolvedValueOnce(
        new Response('ok', {
          status: 200,
        })
      )

    const response = await fetchWithPolicy(
      'http://localhost/test',
      { method: 'GET' },
      {
        retryCount: 1,
        retryDelayMs: 1,
        timeoutMs: 1000,
      }
    )

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    await expect(response.text()).resolves.toBe('ok')
  })
})
