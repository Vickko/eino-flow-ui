import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { useAuth } from '@/features/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/layout/MainLayout.vue'),
      meta: { requiresAuth: true }, // 需要认证
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/layout/ChatLayout.vue'),
      meta: { requiresAuth: true }, // 需要认证
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/layout/NotFoundLayout.vue'),
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

    // 如果认证被禁用，允许所有导航
    if (!isAuthEnabled.value) {
      next()
      return
    }

    // 在首次导航时等待认证检查
    if (isLoading.value) {
      await initAuth()
    }

    // 检查路由是否需要认证
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

    if (requiresAuth && !isAuthenticated.value) {
      // 使用完整 URL 确保浏览器执行完整页面导航
      const currentOrigin = window.location.origin
      const loginUrl = `${currentOrigin}/api/auth/login`

      // 使用 window.location.replace 而不是 href 赋值，确保不会在历史记录中留下记录
      window.location.replace(loginUrl)

      // 不调用 next()，中止当前导航
      return
    }

    next()
  }
)

export default router
