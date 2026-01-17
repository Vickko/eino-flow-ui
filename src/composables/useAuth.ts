import { ref, computed, readonly } from 'vue'
import { getUserInfo as fetchUserInfo, logout as logoutApi } from '@/api/auth'
import type { UserInfo, AuthState } from '@/types'

// 检查是否启用认证（从环境变量读取）
const isAuthEnabled = computed(() => import.meta.env.VITE_ENABLE_AUTH === 'true')

// 全局响应式状态（单例模式）
const isAuthenticated = ref<boolean>(false)
const isLoading = ref<boolean>(true)
const user = ref<UserInfo | null>(null)
const error = ref<string | null>(null)

// 跟踪初始化状态以防止重复检查
let isInitialized = false

export function useAuth() {
  /**
   * 初始化认证状态
   * 在应用挂载时调用一次
   */
  const initAuth = async (): Promise<void> => {
    if (isInitialized) return

    // 如果认证被禁用，立即设置为已认证状态
    if (!isAuthEnabled.value) {
      isAuthenticated.value = true
      isLoading.value = false
      isInitialized = true
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const userInfo = await fetchUserInfo()
      user.value = userInfo
      isAuthenticated.value = true
    } catch (err) {
      // 未认证或网络错误
      user.value = null
      isAuthenticated.value = false

      // 只为非 401 错误设置错误信息（401 是预期的未登录状态）
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status: number } }
        if (axiosError.response?.status !== 401) {
          error.value = '无法检查认证状态'
          console.error('认证初始化错误:', err)
        }
      }
    } finally {
      isLoading.value = false
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
      user.value = userInfo
      isAuthenticated.value = true
      error.value = null
    } catch {
      // 静默处理错误
      user.value = null
      isAuthenticated.value = false
    }
  }

  /**
   * 登出用户并重定向到首页
   */
  const logout = async (): Promise<void> => {
    if (!isAuthEnabled.value) return

    try {
      await logoutApi()
      user.value = null
      isAuthenticated.value = false
      error.value = null
    } catch (err) {
      console.error('登出错误:', err)
      // 即使登出失败，也清除本地状态
      user.value = null
      isAuthenticated.value = false
    }
  }

  /**
   * 手动触发登录重定向
   */
  const login = (): void => {
    if (!isAuthEnabled.value) return

    // 使用 !== undefined 来允许空字符串作为有效值
    const AUTH_BASE =
      import.meta.env.VITE_API_BASE_URL !== undefined
        ? import.meta.env.VITE_API_BASE_URL
        : 'http://localhost:52538'
    window.location.href = `${AUTH_BASE}/api/auth/login`
  }

  /**
   * 清除错误状态
   */
  const clearError = (): void => {
    error.value = null
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
