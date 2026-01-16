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
    const { isAuthenticated, isLoading, initAuth, login, isAuthEnabled } = useAuth()

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
      // 重定向到 OIDC 登录（完整页面重定向）
      login()
      return // 不调用 next()
    }

    next()
  }
)

export default router
