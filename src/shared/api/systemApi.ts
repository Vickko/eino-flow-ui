import type { ApiResponse } from '@/shared/types'
import { apiClient } from '@/shared/api/base'

export const ping = async (): Promise<ApiResponse> => {
  const response = await apiClient.get<ApiResponse>('/ping')
  return response.data
}
