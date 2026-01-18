import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'
import ChatLayout from '@/layout/ChatLayout.vue'
import { useAuth } from '@/composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: MainLayout,
      meta: { requiresAuth: true }, // 需要认证
    },
    {
      path: '/chat',
      name: 'chat',
      component: ChatLayout,
      meta: { requiresAuth: true }, // 需要认证
    },
  ],
})

// 全局导航守卫
router.beforeEach(
  async (
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
  ) => {
    const { isAuthenticated, isLoading, initAuth, isAuthEnabled } = useAuth()

    console.log('[Router Guard]', {
      path: to.path,
      isAuthEnabled: isAuthEnabled.value,
      isAuthenticated: isAuthenticated.value,
      isLoading: isLoading.value,
    })

    // 如果认证被禁用，允许所有导航
    if (!isAuthEnabled.value) {
      console.log('[Router Guard] Auth disabled, allowing navigation')
      next()
      return
    }

    // 在首次导航时等待认证检查
    if (isLoading.value) {
      console.log('[Router Guard] Auth loading, waiting for init...')
      await initAuth()
      console.log('[Router Guard] Auth init complete, isAuthenticated:', isAuthenticated.value)
    }

    // 检查路由是否需要认证
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

    if (requiresAuth && !isAuthenticated.value) {
      console.log(
        '[Router Guard] Route requires auth but user not authenticated, redirecting to login'
      )

      // 使用完整 URL 确保浏览器执行完整页面导航
      const currentOrigin = window.location.origin
      const loginUrl = `${currentOrigin}/api/auth/login`

      console.log('[Router Guard] Redirecting to:', loginUrl)

      // 使用 window.location.replace 而不是 href 赋值，确保不会在历史记录中留下记录
      window.location.replace(loginUrl)

      // 不调用 next()，中止当前导航
      return
    }

    console.log('[Router Guard] Allowing navigation')
    next()
  }
)

export default router
