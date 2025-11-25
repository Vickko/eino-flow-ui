<script setup>
import { onMounted } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import Inspector from '@/components/Inspector.vue'
import BottomPanel from '@/components/BottomPanel.vue'
import { useGraph } from '@/composables/useGraph'
import { useTheme } from '@/composables/useTheme'
import { useLayout } from '@/composables/useLayout'

const { selectedGraphId } = useGraph()
const { initTheme } = useTheme()
const { showSidebar, showInspector, showBottomPanel } = useLayout()

onMounted(() => {
  initTheme()
})
</script>

<template>
  <div class="relative h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
    
    <!-- 1. Graph Layer (Bottom Z-Index) -->
    <div class="absolute inset-0 z-0 bg-muted/20 overflow-hidden">
      <!-- Slot for GraphViewer -->
      <slot :selectedGraphId="selectedGraphId" />
      
      <!-- Grid Background Placeholder (Visual Aid) -->
      <div class="absolute inset-0 pointer-events-none opacity-[0.05]"
           style="background-image: radial-gradient(currentColor 1px, transparent 1px); background-size: 20px 20px;">
      </div>
    </div>

    <!-- 2. UI Overlay Layer (Top Z-Index, Pointer Events None) -->
    <div class="absolute inset-0 z-10 pointer-events-none flex flex-col p-3">
      
      <!-- Top Row: Sidebar + Spacer + Inspector -->
      <div class="flex flex-1 min-h-0 gap-3">
        
        <!-- Sidebar -->
        <Transition name="slide-left">
          <div v-if="showSidebar" class="w-64 h-full pointer-events-auto">
            <Sidebar />
          </div>
        </Transition>

        <!-- Spacer to let clicks pass through to Graph -->
        <div class="flex-1"></div>

        <!-- Inspector -->
        <Transition name="slide-right">
          <div v-if="showInspector" class="w-80 h-full pointer-events-auto">
            <Inspector />
          </div>
        </Transition>
      </div>

      <!-- Bottom Row: BottomPanel -->
      <div
        class="w-full pointer-events-auto shrink-0 transition-all duration-300 ease-in-out overflow-hidden rounded-xl relative z-20"
        :class="showBottomPanel ? 'h-64 mt-3 opacity-100 shadow-panel border border-border/40 bg-background/60 backdrop-blur-xl' : 'h-0 mt-0 opacity-0 border-0'"
      >
        <BottomPanel />
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Sidebar Transition */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s ease-in-out;
}
.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-120%);
}

/* Inspector Transition */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease-in-out;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(120%);
}

/* BottomPanel Transition */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.3s ease-in-out;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
}
</style>