<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { fetchGraphs } from '@/api'
import { useServerStatus } from '@/composables/useServerStatus'
import type { Graph } from '@/types'

const props = withDefaults(
  defineProps<{
    searchQuery?: string
    selectedId?: string
  }>(),
  {
    searchQuery: '',
    selectedId: '',
  }
)

const emit = defineEmits<{
  select: [id: string, name: string]
}>()

const { isOnline } = useServerStatus()
const graphs = ref<Graph[]>([])
const loading = ref(false)

const loadGraphs = async (): Promise<void> => {
  if (!isOnline.value) return
  loading.value = true
  try {
    const res = await fetchGraphs()
    if (res.code === 0 && res.data?.graphs) {
      graphs.value = res.data.graphs
    }
  } catch (e) {
    console.error('Failed to load graphs', e)
  } finally {
    loading.value = false
  }
}

watch(isOnline, (newVal) => {
  if (newVal) {
    loadGraphs()
  } else {
    graphs.value = []
  }
})

onMounted(() => {
  if (isOnline.value) {
    loadGraphs()
  }
})

const filteredGraphs = computed(() => {
  if (!props.searchQuery) return graphs.value
  return graphs.value.filter((g) => g.name.toLowerCase().includes(props.searchQuery.toLowerCase()))
})
</script>

<template>
  <div class="space-y-1 mt-1">
    <div v-if="loading" class="p-4 text-center text-sm text-muted-foreground">Loading...</div>

    <div
      v-else-if="filteredGraphs.length === 0"
      class="p-4 text-center text-sm text-muted-foreground"
    >
      {{ isOnline ? 'No graphs found' : 'Waiting for connection...' }}
    </div>

    <template v-else>
      <div
        v-for="graph in filteredGraphs"
        :key="graph.id"
        class="relative px-3 py-2 rounded-r-md text-sm font-medium cursor-pointer transition-all duration-200 ease-out truncate border-l-2"
        :class="[
          selectedId === graph.id
            ? 'bg-primary/10 text-primary border-primary'
            : 'border-transparent text-muted-foreground hover:bg-primary/5 hover:text-foreground hover:translate-x-1',
        ]"
        :title="graph.name"
        @click="
          selectedId === graph.id ? $emit('select', '', '') : $emit('select', graph.id, graph.name)
        "
      >
        {{ graph.name }}
        <!-- Glowing effect for active state -->
        <div
          v-if="selectedId === graph.id"
          class="absolute left-0 top-0 bottom-0 w-0.5 bg-primary shadow-[0_0_10px_2px_rgba(var(--primary),0.5)]"
        ></div>
      </div>
    </template>
  </div>
</template>
