import type { ApiResponse } from '@/shared/types'
import { apiClient } from '@/shared/api/base'
import { createBusinessError } from '@/shared/api/errors'
import { requestWithPolicy } from '@/shared/api/request'

export const ping = async (): Promise<ApiResponse> => {
  const data = await requestWithPolicy(
    async (signal) => {
      const response = await apiClient.get<ApiResponse>('/ping', { signal })
      return response.data
    },
    {
      retryCount: 0,
      timeoutMs: 4000,
    }
  )

  if (data.code !== 0) {
    throw createBusinessError(data.code, data.msg || 'Ping failed')
  }

  return data
}
