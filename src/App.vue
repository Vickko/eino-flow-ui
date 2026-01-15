<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { initAuth, isLoading, isAuthEnabled } = useAuth()

onMounted(async () => {
  // 仅在认证启用时初始化
  if (isAuthEnabled.value) {
    await initAuth()
  }
})
</script>

<template>
  <!-- 认证检查期间的加载屏幕（仅在认证启用时显示） -->
  <div
    v-if="isAuthEnabled && isLoading"
    class="flex items-center justify-center h-screen bg-background"
  >
    <div class="text-center">
      <div
        class="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"
      ></div>
      <p class="mt-4 text-muted-foreground">正在验证身份...</p>
    </div>
  </div>

  <!-- 认证验证后或认证禁用时显示应用 -->
  <router-view v-else />
</template>
