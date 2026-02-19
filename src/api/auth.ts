import axios, { type AxiosInstance } from 'axios'
import type { UserInfo } from '@/shared/types'

// 使用 !== undefined 来允许空字符串作为有效值
const AUTH_BASE =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:52538'

const authClient: AxiosInstance = axios.create({
  baseURL: AUTH_BASE,
  withCredentials: true, // 关键：发送 httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 检查认证状态并获取用户信息
 * 如果已认证返回用户信息，否则抛出错误
 */
export const getUserInfo = async (): Promise<UserInfo> => {
  const response = await authClient.get<UserInfo>('/api/auth/userinfo')
  return response.data
}

/**
 * 发起 OIDC 登录流程
 * 重定向到 ZITADEL 登录页面
 */
export const login = (): void => {
  window.location.href = `${AUTH_BASE}/api/auth/login`
}

/**
 * 登出当前用户
 * 清除服务端 cookie 并重定向到首页
 */
export const logout = async (): Promise<void> => {
  await authClient.post('/api/auth/logout')
  // 登出后重定向到首页（路由守卫会处理重定向到登录）
  window.location.href = '/'
}
