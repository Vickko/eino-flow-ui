<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { MessageCircle, Home } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const isChat = computed(() => route.name === 'chat')

const toggleView = () => {
  if (isChat.value) {
    router.push('/')
  } else {
    router.push('/chat')
  }
}
</script>

<template>
  <router-view />

  <button
    @click="toggleView"
    class="fixed bottom-6 right-6 z-[100] p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
    :class="isChat ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-blue-500 text-white hover:bg-blue-600'"
  >
    <Home v-if="isChat" class="w-6 h-6" />
    <MessageCircle v-else class="w-6 h-6" />
  </button>
</template>
