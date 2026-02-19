import { storeToRefs } from 'pinia'
import { useApiConfigStore } from '@/shared/stores/apiConfigStore'

export function useApiConfig() {
  const apiConfigStore = useApiConfigStore()
  const { apiBaseUrl } = storeToRefs(apiConfigStore)

  return {
    apiBaseUrl,
    updateApiBaseUrl: apiConfigStore.updateApiBaseUrl,
    resetApiBaseUrl: apiConfigStore.resetApiBaseUrl,
    DEFAULT_API_BASE: apiConfigStore.DEFAULT_API_BASE,
  }
}
