<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  ChevronLeft,
  Loader2,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Spline,
  Workflow,
} from 'lucide-vue-next'
import type { EdgeType, GraphNavigationItem } from '@/shared/types'

const props = defineProps<{
  loading: boolean
  graphName: string
  graphVersion: string
  selectedGraphId: string | null
  canNavigateBack: boolean
  graphNavigationStack: GraphNavigationItem[]

  showSidebar: boolean
  showInspector: boolean
  showBottomPanel: boolean

  edgeType: EdgeType
}>()

const emit = defineEmits<{
  toggleSidebar: []
  toggleBottomPanel: []
  toggleInspector: []
  toggleEdgeType: []
  navigateBack: []
}>()

const showToolbar = ref(false)
let hideTimeout: ReturnType<typeof setTimeout> | undefined

const contentRef = ref<HTMLElement | null>(null)
const wrapperWidth = ref<number | string>('auto')
let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  if (!contentRef.value) return

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      wrapperWidth.value = entry.contentRect.width
    }
  })

  resizeObserver.observe(contentRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  clearTimeout(hideTimeout)
})

const show = (): void => {
  clearTimeout(hideTimeout)
  showToolbar.value = true
}

const hide = (): void => {
  hideTimeout = setTimeout(() => {
    showToolbar.value = false
  }, 300)
}

const previousGraphLabel = computed(() => {
  const stack = props.graphNavigationStack
  if (stack.length < 2) return ''
  return stack[stack.length - 2]?.name ?? ''
})
</script>

<template>
  <!-- Hover Trigger Zone -->
  <div class="absolute top-0 left-0 right-0 h-8 z-[60]" @mouseenter="show" @mouseleave="hide"></div>

  <Teleport to="body">
    <div
      class="fixed top-0 left-0 right-0 z-[9999] flex justify-center transition-transform duration-300 ease-in-out pointer-events-none"
      :class="showToolbar ? 'translate-y-4' : '-translate-y-full'"
    >
      <div
        class="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border border-border shadow-panel rounded-full px-4 py-2 flex items-center gap-4 pointer-events-auto transition-all duration-300 ease-in-out"
        @mouseenter="show"
        @mouseleave="hide"
      >
        <button
          class="flex items-center justify-center w-6 h-6 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer"
          :class="{ 'text-primary': props.showSidebar }"
          title="Toggle Sidebar"
          @click="emit('toggleSidebar')"
        >
          <PanelLeft class="w-4 h-4" />
        </button>

        <div class="h-3 w-px bg-border"></div>

        <div
          class="transition-[width] duration-300 ease-in-out overflow-hidden"
          :style="{ width: typeof wrapperWidth === 'number' ? wrapperWidth + 'px' : wrapperWidth }"
        >
          <div ref="contentRef" class="w-max flex items-center justify-center min-w-[24px]">
            <Transition
              mode="out-in"
              enter-active-class="transition-all duration-200 ease-in-out"
              leave-active-class="transition-all duration-200 ease-in-out"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div v-if="props.loading" class="flex items-center justify-center px-2 h-6">
                <Loader2 class="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
              <div v-else class="flex items-center gap-2">
                <button
                  v-if="props.canNavigateBack"
                  class="flex items-center justify-center w-5 h-5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  :title="previousGraphLabel ? `返回: ${previousGraphLabel}` : '返回'"
                  @click="emit('navigateBack')"
                >
                  <ChevronLeft class="w-4 h-4" />
                </button>

                <h2 class="font-semibold text-foreground text-sm">
                  {{ props.graphName || 'No Graph Selected' }}
                </h2>

                <div v-if="props.selectedGraphId" class="flex items-center gap-3 whitespace-nowrap ml-3">
                  <span class="w-px h-4 bg-border"></span>
                  <div class="flex items-center gap-2 text-xs text-muted-foreground">
                    <span class="font-mono">{{ props.selectedGraphId }}</span>
                    <span>v{{ props.graphVersion }}</span>
                  </div>
                  <div class="flex items-center gap-2 ml-2">
                    <span
                      class="px-2 py-0.5 bg-green-500/10 text-green-600 text-[10px] font-medium rounded-full uppercase tracking-wider"
                      >Active</span
                    >
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="h-3 w-px bg-border"></div>

        <button
          class="flex items-center justify-center w-6 h-6 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer"
          :title="props.edgeType === 'smoothstep' ? '切换为曲线' : '切换为折线'"
          @click="emit('toggleEdgeType')"
        >
          <Spline v-if="props.edgeType === 'default'" class="w-4 h-4" />
          <Workflow v-else class="w-4 h-4" />
        </button>

        <div class="h-3 w-px bg-border"></div>

        <button
          class="flex items-center justify-center w-6 h-6 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer"
          :class="{ 'text-primary': props.showBottomPanel }"
          title="Toggle Bottom Panel"
          @click="emit('toggleBottomPanel')"
        >
          <PanelBottom class="w-4 h-4" />
        </button>

        <button
          class="flex items-center justify-center w-6 h-6 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer"
          :class="{ 'text-primary': props.showInspector }"
          title="Toggle Inspector"
          @click="emit('toggleInspector')"
        >
          <PanelRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
