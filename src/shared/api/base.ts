import axios, { type AxiosInstance } from 'axios'

const DEVOPS_API_PREFIX = '/eino/devops'

// Users may provide either:
// - an origin:               "https://devops.vickko.com" or "http://localhost:52538"
// - a full DevOps base path: "https://devops.vickko.com/eino/devops"
// We normalize it to an origin so we do not accidentally create "/eino/devops/eino/devops/...".
export const normalizeDevopsApiOrigin = (input: string): string => {
  const raw = (input ?? '').trim()
  if (raw === '') return ''

  // Remove trailing slashes first.
  let s = raw.replace(/\/+$/, '')

  // If someone pasted the full DevOps base path, strip it back to the origin.
  if (s.endsWith(DEVOPS_API_PREFIX)) {
    s = s.slice(0, -DEVOPS_API_PREFIX.length)
  }

  // Remove trailing slashes again (in case origin ended with "/").
  return s.replace(/\/+$/, '')
}

// 从环境变量读取 API 基础 URL
// 注意：使用 !== undefined 而不是 || 来允许空字符串作为有效值
const API_BASE_ORIGIN =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? normalizeDevopsApiOrigin(import.meta.env.VITE_API_BASE_URL)
    : 'http://localhost:52538'

let apiBaseDevops = `${API_BASE_ORIGIN}${DEVOPS_API_PREFIX}`
const chatApiBase = API_BASE_ORIGIN

// 检查是否启用认证
export const isAuthEnabled = import.meta.env.VITE_ENABLE_AUTH === 'true'

type UnauthorizedHandler = () => void | Promise<void>
let unauthorizedHandler: UnauthorizedHandler | null = null
let isHandlingUnauthorized = false

export const apiClient: AxiosInstance = axios.create({
  baseURL: apiBaseDevops,
  withCredentials: isAuthEnabled, // 仅在认证启用时发送 cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

export const chatApiClient: AxiosInstance = axios.create({
  baseURL: chatApiBase,
  withCredentials: isAuthEnabled, // 仅在认证启用时发送 cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

export const setBaseUrl = (url: string): void => {
  const origin = normalizeDevopsApiOrigin(url)
  apiBaseDevops = `${origin}${DEVOPS_API_PREFIX}`
  apiClient.defaults.baseURL = apiBaseDevops
}

export const getBaseUrl = (): string => apiBaseDevops

export const getChatApiBase = (): string => chatApiBase

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null): void => {
  unauthorizedHandler = handler
}

// 添加 401 响应拦截器（仅在认证启用时）
if (isAuthEnabled) {
  const handle401 = async (error: unknown) => {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number } }
      if (axiosError.response?.status === 401 && unauthorizedHandler && !isHandlingUnauthorized) {
        isHandlingUnauthorized = true
        try {
          await unauthorizedHandler()
        } catch (handlerError) {
          console.error('Error handling 401 unauthorized:', handlerError)
        } finally {
          isHandlingUnauthorized = false
        }
      }
    }
    return Promise.reject(error)
  }

  apiClient.interceptors.response.use((response) => response, handle401)
  chatApiClient.interceptors.response.use((response) => response, handle401)
}
