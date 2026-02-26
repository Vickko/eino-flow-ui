import { ref } from 'vue'
import { defineStore } from 'pinia'
import { normalizeDevopsApiOrigin, setBaseUrl } from '@/shared/api'
import { readAppStorage, writeAppStorage } from '@/shared/lib/storage/appStorage'

const getWindowOrigin = (): string => {
  if (typeof window === 'undefined') {
    return 'http://localhost:52538'
  }
  return window.location.origin
}

const ENV_API_BASE = import.meta.env.VITE_API_BASE_URL
const DEFAULT_API_BASE =
  typeof ENV_API_BASE === 'string' && ENV_API_BASE.trim() !== ''
    ? ENV_API_BASE.trim()
    : getWindowOrigin()

const looksLikeLegacyValue = (value: string): boolean =>
  value.includes('/eino/devops') || value.includes('localhost')

const resolveInitialApiBase = (): string => {
  const storedUrl = readAppStorage('apiBaseUrl')
  const normalizedStoredUrl = storedUrl ? normalizeDevopsApiOrigin(storedUrl) : null

  if (storedUrl && normalizedStoredUrl && storedUrl !== normalizedStoredUrl) {
    writeAppStorage('apiBaseUrl', normalizedStoredUrl)
  }

  let initialUrl = normalizedStoredUrl ?? DEFAULT_API_BASE
  const shouldDefaultToSameOrigin = !(
    typeof ENV_API_BASE === 'string' && ENV_API_BASE.trim() !== ''
  )
  if (
    shouldDefaultToSameOrigin &&
    storedUrl &&
    looksLikeLegacyValue(storedUrl) &&
    initialUrl !== getWindowOrigin()
  ) {
    initialUrl = getWindowOrigin()
    writeAppStorage('apiBaseUrl', initialUrl)
  }

  return initialUrl
}

export const useApiConfigStore = defineStore('apiConfig', () => {
  const apiBaseUrl = ref(resolveInitialApiBase())
  setBaseUrl(apiBaseUrl.value)

  const updateApiBaseUrl = (newUrl: string): void => {
    const normalized = normalizeDevopsApiOrigin(newUrl)
    apiBaseUrl.value = normalized
    writeAppStorage('apiBaseUrl', normalized)
    setBaseUrl(normalized)
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
})
