const STORAGE_NAMESPACE = 'eino_flow_ui'
const STORAGE_VERSION = 1
const STORAGE_VERSION_KEY = `${STORAGE_NAMESPACE}:storage_version`

const KEY_MAP = {
  theme: 'theme',
  apiBaseUrl: 'api_base_url',
} as const

const LEGACY_KEY_MAP: Record<keyof typeof KEY_MAP, string[]> = {
  theme: ['theme'],
  apiBaseUrl: ['devops_api_base_url'],
}

type AppStorageKey = keyof typeof KEY_MAP

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const toScopedKey = (key: AppStorageKey): string =>
  `${STORAGE_NAMESPACE}:v${STORAGE_VERSION}:${KEY_MAP[key]}`

const safeGetItem = (storage: Storage, key: string): string | null => {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

const safeSetItem = (storage: Storage, key: string, value: string): void => {
  try {
    storage.setItem(key, value)
  } catch {
    // Ignore storage write errors so app bootstrap will not crash.
  }
}

const safeRemoveItem = (storage: Storage, key: string): void => {
  try {
    storage.removeItem(key)
  } catch {
    // Ignore storage remove errors so app bootstrap will not crash.
  }
}

const migrateLegacyKeys = (storage: Storage): void => {
  const storedVersion = safeGetItem(storage, STORAGE_VERSION_KEY)
  if (storedVersion === String(STORAGE_VERSION)) {
    return
  }

  const keys = Object.keys(KEY_MAP) as AppStorageKey[]
  keys.forEach((key) => {
    const scopedKey = toScopedKey(key)
    if (safeGetItem(storage, scopedKey) !== null) {
      return
    }

    const legacyKeys = LEGACY_KEY_MAP[key]
    for (const legacyKey of legacyKeys) {
      const legacyValue = safeGetItem(storage, legacyKey)
      if (legacyValue !== null) {
        safeSetItem(storage, scopedKey, legacyValue)
        break
      }
    }
  })

  safeSetItem(storage, STORAGE_VERSION_KEY, String(STORAGE_VERSION))
}

export const readAppStorage = (key: AppStorageKey): string | null => {
  const storage = getStorage()
  if (!storage) {
    return null
  }
  migrateLegacyKeys(storage)
  return safeGetItem(storage, toScopedKey(key))
}

export const writeAppStorage = (key: AppStorageKey, value: string): void => {
  const storage = getStorage()
  if (!storage) {
    return
  }
  migrateLegacyKeys(storage)
  safeSetItem(storage, toScopedKey(key), value)
}

export const removeAppStorage = (key: AppStorageKey): void => {
  const storage = getStorage()
  if (!storage) {
    return
  }
  migrateLegacyKeys(storage)
  safeRemoveItem(storage, toScopedKey(key))
}
