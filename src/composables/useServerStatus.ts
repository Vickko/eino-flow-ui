import { ref } from 'vue'
import { ping } from '@/api'

const isOnline = ref(true)
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
    failCount++
    if (failCount >= 2 && isOnline.value) {
      isOnline.value = false
    }
  }
}

const startHeartbeat = (): void => {
  if (timer) return
  checkHeartbeat()
  timer = setInterval(checkHeartbeat, 500)
}

export function useServerStatus() {
  startHeartbeat()

  return {
    isOnline,
    checkHeartbeat,
  }
}
