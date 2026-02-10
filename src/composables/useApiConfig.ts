import { ref } from 'vue'
import { normalizeDevopsApiOrigin, setBaseUrl } from '@/api'

const STORAGE_KEY = 'devops_api_base_url'

// Default behavior:
// - If VITE_API_BASE_URL is set (and not empty), use it.
// - Otherwise, use the current site origin (so production works out of the box and does not hit CORS).
const ENV_API_BASE = import.meta.env.VITE_API_BASE_URL
const DEFAULT_API_BASE =
  typeof ENV_API_BASE === 'string' && ENV_API_BASE.trim() !== ''
    ? ENV_API_BASE.trim()
    : window.location.origin

const storedUrl = localStorage.getItem(STORAGE_KEY)
const normalizedStoredUrl = storedUrl ? normalizeDevopsApiOrigin(storedUrl) : null

// One-time migration: if old value included "/eino/devops", rewrite it to just the origin.
if (storedUrl && normalizedStoredUrl && storedUrl !== normalizedStoredUrl) {
  localStorage.setItem(STORAGE_KEY, normalizedStoredUrl)
}

// If the app is configured to use same-origin by default (VITE_API_BASE_URL is empty),
// but localStorage still has a legacy value like ".../eino/devops" or "localhost",
// prefer the current site origin to avoid accidental cross-origin + CORS issues.
let initialUrl = normalizedStoredUrl ?? DEFAULT_API_BASE
const shouldDefaultToSameOrigin = !(typeof ENV_API_BASE === 'string' && ENV_API_BASE.trim() !== '')
const looksLikeLegacyValue =
  !!storedUrl && (storedUrl.includes('/eino/devops') || storedUrl.includes('localhost'))
if (shouldDefaultToSameOrigin && looksLikeLegacyValue && initialUrl !== window.location.origin) {
  initialUrl = window.location.origin
  localStorage.setItem(STORAGE_KEY, initialUrl)
}

setBaseUrl(initialUrl)

const apiBaseUrl = ref(initialUrl)

export function useApiConfig() {
  const updateApiBaseUrl = (newUrl: string): void => {
    const normalized = normalizeDevopsApiOrigin(newUrl)

    apiBaseUrl.value = normalized
    localStorage.setItem(STORAGE_KEY, normalized)
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
}
