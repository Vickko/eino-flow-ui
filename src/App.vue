<script setup lang="ts">
// 认证检查已移至 router guard，无需在 App.vue 中重复检查
</script>

<template>
  <!-- 直接渲染路由视图，认证检查由 router guard 处理 -->
  <router-view />
</template>
