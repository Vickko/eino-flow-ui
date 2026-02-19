import { getCurrentScope, onScopeDispose } from 'vue'
import { storeToRefs } from 'pinia'
import { useServerStatusStore } from '@/features/graph/stores/serverStatusStore'

let hasDetachedHeartbeatRetainer = false

export function useServerStatus() {
  const serverStatusStore = useServerStatusStore()
  const { isOnline } = storeToRefs(serverStatusStore)

  const currentScope = getCurrentScope()
  if (currentScope) {
    serverStatusStore.retainHeartbeat()
    onScopeDispose(() => {
      serverStatusStore.releaseHeartbeat()
    })
  } else if (!hasDetachedHeartbeatRetainer || serverStatusStore.heartbeatSubscribers === 0) {
    hasDetachedHeartbeatRetainer = true
    serverStatusStore.retainHeartbeat()
  }

  return {
    isOnline,
    checkHeartbeat: serverStatusStore.checkHeartbeat,
  }
}
