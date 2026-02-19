import { ref } from 'vue'
import { defineStore } from 'pinia'
import { ping } from '@/shared/api'

const HEARTBEAT_INTERVAL_MS = 500
const OFFLINE_FAIL_THRESHOLD = 2

export const useServerStatusStore = defineStore('serverStatus', () => {
  const isOnline = ref(true)
  const isHeartbeatActive = ref(false)
  const heartbeatSubscribers = ref(0)

  let failCount = 0
  let timer: ReturnType<typeof setInterval> | null = null

  const checkHeartbeat = async (): Promise<void> => {
    try {
      await ping()
      failCount = 0
      if (!isOnline.value) {
        isOnline.value = true
      }
    } catch {
      failCount += 1
      if (failCount >= OFFLINE_FAIL_THRESHOLD && isOnline.value) {
        isOnline.value = false
      }
    }
  }

  const startHeartbeat = (): void => {
    if (timer) return
    isHeartbeatActive.value = true
    void checkHeartbeat()
    timer = setInterval(() => {
      void checkHeartbeat()
    }, HEARTBEAT_INTERVAL_MS)
  }

  const stopHeartbeat = (): void => {
    if (!timer) return
    clearInterval(timer)
    timer = null
    isHeartbeatActive.value = false
    failCount = 0
  }

  const retainHeartbeat = (): void => {
    heartbeatSubscribers.value += 1
    startHeartbeat()
  }

  const releaseHeartbeat = (): void => {
    heartbeatSubscribers.value = Math.max(0, heartbeatSubscribers.value - 1)
    if (heartbeatSubscribers.value === 0) {
      stopHeartbeat()
    }
  }

  const reset = (): void => {
    heartbeatSubscribers.value = 0
    stopHeartbeat()
    isOnline.value = true
  }

  return {
    isOnline,
    isHeartbeatActive,
    heartbeatSubscribers,
    checkHeartbeat,
    startHeartbeat,
    stopHeartbeat,
    retainHeartbeat,
    releaseHeartbeat,
    reset,
  }
})
