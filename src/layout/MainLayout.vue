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
  <div class="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
    <!-- Left Sidebar -->
    <div
      class="h-full border-r border-border flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
      :class="showSidebar ? 'w-64' : 'w-0 border-r-0'"
    >
      <div class="w-64 h-full">
        <Sidebar />
      </div>
    </div>

    <!-- Main Content Column -->
    <div class="flex flex-1 flex-col min-w-0 transition-all duration-300">
      
      <!-- Top Area (Canvas + Inspector) -->
      <div class="flex flex-1 min-h-0 relative">
        
        <!-- Canvas Container -->
        <main class="flex-1 relative bg-muted/20 overflow-hidden flex flex-col">

          <!-- Slot for GraphViewer -->
          <slot :selectedGraphId="selectedGraphId" />
          
          <!-- Grid Background Placeholder (Visual Aid) -->
          <div class="absolute inset-0 pointer-events-none opacity-[0.03]"
               style="background-image: radial-gradient(#000 1px, transparent 1px); background-size: 20px 20px;">
          </div>
        </main>

        <!-- Right Inspector -->
        <div
          class="border-l border-border flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
          :class="showInspector ? 'w-80' : 'w-0 border-l-0'"
        >
          <div class="w-80 h-full">
            <Inspector />
          </div>
        </div>
      </div>

      <!-- Bottom Panel -->
      <div
        class="border-t border-border flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
        :class="showBottomPanel ? 'h-64' : 'h-0 border-t-0'"
      >
        <BottomPanel />
      </div>
    </div>
  </div>
</template>