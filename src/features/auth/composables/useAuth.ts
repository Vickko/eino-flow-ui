import { computed, readonly } from 'vue'
import { storeToRefs } from 'pinia'
import { getUserInfo as fetchUserInfo, logout as logoutApi } from '@/features/auth/api/authApi'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { isApiClientError, setUnauthorizedHandler } from '@/shared/api'
import type { AuthState } from '@/shared/types'

// 检查是否启用认证（从环境变量读取）
const isAuthEnabled = computed(() => import.meta.env.VITE_ENABLE_AUTH === 'true')

// 跟踪初始化状态以防止重复检查
let isInitialized = false

// 防止重复登录重定向的标志
let isRedirecting = false
const redirectToLogin = (): void => {
  if (!isAuthEnabled.value) return

  // 防止重复重定向
  if (isRedirecting) {
    return
  }

  isRedirecting = true

  // 使用绝对 URL 确保可靠的重定向
  const currentOrigin = window.location.origin
  const loginUrl = `${currentOrigin}/api/auth/login`

  // 使用 replace 避免在历史记录中留下记录
  window.location.replace(loginUrl)
}

setUnauthorizedHandler(() => {
  redirectToLogin()
})

export function useAuth() {
  const authStore = useAuthStore()
  const { isAuthenticated, isLoading, user, error } = storeToRefs(authStore)

  /**
   * 初始化认证状态
   * 在应用挂载时调用一次
   */
  const initAuth = async (): Promise<void> => {
    if (isInitialized) return

    // 如果认证被禁用，立即设置为已认证状态
    if (!isAuthEnabled.value) {
      authStore.setAuthResult({
        isAuthenticated: true,
        user: null,
        error: null,
      })
      authStore.setLoading(false)
      isInitialized = true
      return
    }

    authStore.setLoading(true)
    authStore.clearError()

    try {
      const userInfo = await fetchUserInfo()
      authStore.setAuthResult({
        isAuthenticated: true,
        user: userInfo,
        error: null,
      })
    } catch (err) {
      // 未认证或网络错误
      authStore.setAuthResult({
        isAuthenticated: false,
        user: null,
        error: null,
      })

      // 只为非 401 错误设置错误信息（401 是预期的未登录状态）
      if (!isApiClientError(err) || err.kind !== 'unauthorized') {
        authStore.setAuthResult({
          isAuthenticated: false,
          user: null,
          error: '无法检查认证状态',
        })
        console.error('认证初始化错误:', err)
      }
    } finally {
      authStore.setLoading(false)
      isInitialized = true
    }
  }

  /**
   * 从后端刷新用户信息
   * 在可能改变用户数据的操作后使用
   */
  const refreshAuth = async (): Promise<void> => {
    if (!isAuthEnabled.value) return

    try {
      const userInfo = await fetchUserInfo()
      authStore.setAuthResult({
        isAuthenticated: true,
        user: userInfo,
        error: null,
      })
    } catch {
      // 静默处理错误
      authStore.setAuthResult({
        isAuthenticated: false,
        user: null,
        error: null,
      })
    }
  }

  /**
   * 登出用户并重定向到首页
   */
  const logout = async (): Promise<void> => {
    if (!isAuthEnabled.value) return

    try {
      await logoutApi()
      authStore.setAuthResult({
        isAuthenticated: false,
        user: null,
        error: null,
      })
    } catch (err) {
      console.error('登出错误:', err)
      // 即使登出失败，也清除本地状态
      authStore.setAuthResult({
        isAuthenticated: false,
        user: null,
        error: null,
      })
    }
  }

  /**
   * 手动触发登录重定向
   */
  const login = (): void => {
    redirectToLogin()
  }

  /**
   * 清除错误状态
   */
  const clearError = (): void => {
    authStore.clearError()
  }

  // 计算的状态对象（便于使用）
  const authState = computed<AuthState>(() => ({
    isAuthenticated: isAuthenticated.value,
    isLoading: isLoading.value,
    user: user.value,
    error: error.value,
  }))

  return {
    // 状态（只读 refs 防止外部修改）
    isAuthenticated: readonly(isAuthenticated),
    isLoading: readonly(isLoading),
    user: readonly(user),
    error: readonly(error),
    isAuthEnabled: readonly(isAuthEnabled),
    authState: readonly(authState),

    // 操作方法
    initAuth,
    refreshAuth,
    login,
    logout,
    clearError,
  }
}
