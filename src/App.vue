<script setup>
import MainLayout from '@/layout/MainLayout.vue'
import GraphViewer from '@/components/GraphViewer.vue'
</script>

<template>
  <MainLayout v-slot="{ selectedGraphId }">
    <GraphViewer :graph-id="selectedGraphId" />
  </MainLayout>
</template>
