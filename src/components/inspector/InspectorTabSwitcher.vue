<script setup lang="ts">
import { ref, watch } from 'vue'
import { Activity, MessageSquare, Settings2 } from 'lucide-vue-next'

type InspectorTab = 'config' | 'trace' | 'chat'

const props = defineProps<{
  modelValue: InspectorTab
  showChat: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: InspectorTab]
}>()

const playChatAnimation = ref(false)
const playTraceAnimation = ref(false)

watch(
  () => props.modelValue,
  (newTab, oldTab) => {
    if (newTab === 'chat' && oldTab !== 'chat') {
      playChatAnimation.value = true
      setTimeout(() => {
        playChatAnimation.value = false
      }, 500)
    }

    if (newTab === 'trace' && oldTab !== 'trace') {
      playTraceAnimation.value = true
      setTimeout(() => {
        playTraceAnimation.value = false
      }, 200)
    }
  }
)
</script>

<template>
  <div
    class="relative flex items-center bg-muted/20 rounded-lg p-1 border border-border/50 h-8 cursor-pointer"
    :class="props.showChat ? 'w-28' : 'w-20'"
  >
    <!-- Sliding Background -->
    <div
      class="absolute top-1 bottom-1 rounded-md bg-background shadow-sm transition-all duration-300 ease-in-out"
      :class="
        props.showChat
          ? props.modelValue === 'config'
            ? 'left-1 w-[calc(33.333%-4px)]'
            : props.modelValue === 'trace'
              ? 'left-[33.333%] w-[calc(33.333%-4px)]'
              : 'left-[66.666%] w-[calc(33.333%-4px)]'
          : props.modelValue === 'config'
            ? 'left-1 w-[calc(50%-4px)]'
            : 'left-[50%] w-[calc(50%-4px)]'
      "
    ></div>

    <!-- Buttons -->
    <div
      class="relative z-10 flex-1 flex items-center justify-center h-full transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
      :class="props.modelValue === 'config' ? 'text-foreground' : 'text-muted-foreground'"
      title="Configuration"
      @click="emit('update:modelValue', 'config')"
    >
      <Settings2
        class="w-4 h-4 transition-transform duration-200"
        :class="props.modelValue === 'config' ? 'rotate-90' : ''"
      />
    </div>

    <div
      class="relative z-10 flex-1 flex items-center justify-center h-full transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
      :class="props.modelValue === 'trace' ? 'text-foreground' : 'text-muted-foreground'"
      title="Trace & Logs"
      @click="emit('update:modelValue', 'trace')"
    >
      <div v-if="props.modelValue === 'trace'" class="ecg-wrapper">
        <div class="ecg-container" :class="{ 'ecg-scroll': playTraceAnimation }">
          <Activity class="w-4 h-4 ecg-wave" />
          <Activity class="w-4 h-4 ecg-wave" />
        </div>
      </div>
      <Activity v-else class="w-4 h-4 transition-transform duration-200" />
    </div>

    <div
      v-if="props.showChat"
      class="relative z-10 flex-1 flex items-center justify-center h-full transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
      :class="props.modelValue === 'chat' ? 'text-foreground' : 'text-muted-foreground'"
      title="Chat Messages"
      @click="emit('update:modelValue', 'chat')"
    >
      <MessageSquare class="w-4 h-4 transition-transform duration-200" :class="{ 'animate-wiggle': playChatAnimation }" />
    </div>
  </div>
</template>

<style scoped>
@keyframes wiggle {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(-12deg) scale(1.1);
  }
  75% {
    transform: rotate(12deg) scale(1.1);
  }
}

@keyframes ecg-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.animate-wiggle {
  animation: wiggle 0.5s ease-in-out;
}

.ecg-wrapper {
  width: 1rem;
  height: 1rem;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.ecg-container {
  display: flex;
  gap: 0;
  will-change: transform;
}

.ecg-scroll {
  animation: ecg-scroll 0.2s ease-in-out;
}

.ecg-wave {
  flex-shrink: 0;
}
</style>

