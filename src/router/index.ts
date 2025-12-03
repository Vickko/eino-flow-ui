import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'
import ChatLayout from '@/layout/ChatLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: MainLayout
    },
    {
      path: '/chat',
      name: 'chat',
      component: ChatLayout
    }
  ]
})

export default router