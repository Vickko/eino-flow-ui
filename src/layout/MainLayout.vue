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
      <div class="absolute inset-0 pointer-events-none opacity-[0.03]"
           style="background-image: radial-gradient(#000 1px, transparent 1px); background-size: 20px 20px;">
      </div>
    </div>

    <!-- 2. UI Overlay Layer (Top Z-Index, Pointer Events None) -->
    <div class="absolute inset-0 z-10 pointer-events-none flex p-3 gap-3">
      
      <!-- Left Sidebar Container -->
      <div
        class="h-full flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden pointer-events-auto"
        :class="showSidebar ? 'w-64' : 'w-0'"
      >
        <div class="w-64 h-full">
          <Sidebar />
        </div>
      </div>

      <!-- Right Column (Inspector + BottomPanel) -->
      <div class="flex flex-col flex-1 min-w-0 gap-3">
        
        <!-- Top Row: Spacer + Inspector -->
        <div class="flex flex-1 min-h-0 gap-3">
          <!-- Spacer to let clicks pass through to Graph -->
          <div class="flex-1"></div>

          <!-- Right Inspector Container -->
          <div
            class="flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden pointer-events-auto"
            :class="showInspector ? 'w-80' : 'w-0'"
          >
            <div class="w-80 h-full">
              <Inspector />
            </div>
          </div>
        </div>

        <!-- Bottom Panel Container -->
        <div
          class="flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden pointer-events-auto"
          :class="showBottomPanel ? 'h-64' : 'h-0'"
        >
          <BottomPanel />
        </div>
      </div>

    </div>
  </div>
</template>