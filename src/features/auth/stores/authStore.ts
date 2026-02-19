import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserInfo } from '@/shared/types'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const isLoading = ref(true)
  const user = ref<UserInfo | null>(null)
  const error = ref<string | null>(null)

  const setLoading = (loading: boolean): void => {
    isLoading.value = loading
  }

  const setAuthResult = (payload: {
    isAuthenticated: boolean
    user: UserInfo | null
    error?: string | null
  }): void => {
    isAuthenticated.value = payload.isAuthenticated
    user.value = payload.user
    error.value = payload.error ?? null
  }

  const clearError = (): void => {
    error.value = null
  }

  const reset = (): void => {
    isAuthenticated.value = false
    isLoading.value = true
    user.value = null
    error.value = null
  }

  return {
    isAuthenticated,
    isLoading,
    user,
    error,
    setLoading,
    setAuthResult,
    clearError,
    reset,
  }
})
