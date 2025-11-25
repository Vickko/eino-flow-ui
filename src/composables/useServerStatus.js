import { ref } from 'vue';
import { ping } from '@/api';

// Global state (Singleton)
const isOnline = ref(true);
let failCount = 0;
let timer = null;

const checkHeartbeat = async () => {
  try {
    await ping();
    // If success, reset fail count
    failCount = 0;
    // If it was offline, mark as online immediately
    if (!isOnline.value) {
      isOnline.value = true;
    }
  } catch (e) {
    failCount++;
    // If failed 2 times in a row, mark as offline
    if (failCount >= 2 && isOnline.value) {
      isOnline.value = false;
    }
  }
};

const startHeartbeat = () => {
  if (timer) return;
  checkHeartbeat(); // Immediate check
  timer = setInterval(checkHeartbeat, 500);
};

export function useServerStatus() {
  // Ensure heartbeat is running when this composable is used
  startHeartbeat();

  return {
    isOnline
  };
}