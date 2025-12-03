import { ref } from 'vue'
import { setBaseUrl } from '@/api'

const STORAGE_KEY = 'devops_api_base_url'
const DEFAULT_API_BASE = 'http://localhost:52538/eino/devops'

const storedUrl = localStorage.getItem(STORAGE_KEY)
const initialUrl = storedUrl ?? DEFAULT_API_BASE

setBaseUrl(initialUrl)

const apiBaseUrl = ref(initialUrl)

export function useApiConfig() {
  const updateApiBaseUrl = (newUrl: string): void => {
    if (!newUrl) return

    apiBaseUrl.value = newUrl
    localStorage.setItem(STORAGE_KEY, newUrl)
    setBaseUrl(newUrl)
  }

  const resetApiBaseUrl = (): void => {
    updateApiBaseUrl(DEFAULT_API_BASE)
  }

  return {
    apiBaseUrl,
    updateApiBaseUrl,
    resetApiBaseUrl,
    DEFAULT_API_BASE,
  }
}
