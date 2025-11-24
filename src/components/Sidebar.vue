<script setup>
import { ref, computed, onMounted } from 'vue';
import { Sun, Moon } from 'lucide-vue-next';
import { fetchGraphs } from '@/api';
import { useGraph } from '@/composables/useGraph';
import { useTheme } from '@/composables/useTheme';
import GraphList from '@/components/GraphList.vue';

const { selectedGraphId, setSelectedGraphId } = useGraph();
const { isDark, toggleTheme } = useTheme();
const graphs = ref([]);
const searchQuery = ref('');
const loading = ref(false);

const filteredGraphs = computed(() => {
  if (!searchQuery.value) return graphs.value;
  return graphs.value.filter(g =>
    g.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const loadGraphs = async () => {
  loading.value = true;
  try {
    const res = await fetchGraphs();
    if (res.code === 0 && res.data?.graphs) {
      graphs.value = res.data.graphs;
    }
  } catch (e) {
    console.error('Failed to load graphs', e);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadGraphs();
});
</script>

<template>
  <aside class="w-64 h-full rounded-xl border border-border bg-card/80 backdrop-blur-md flex flex-col shadow-sm">
    <!-- Header / Branding -->
    <div class="p-4 border-b border-border/50 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-xs font-bold">E</div>
        <h1 class="font-semibold text-foreground">Eino DevOps</h1>
      </div>
      <button
        @click="toggleTheme"
        class="flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      >
        <Sun v-if="!isDark" class="w-4 h-4" />
        <Moon v-else class="w-4 h-4" />
      </button>
    </div>

    <!-- Search -->
    <div class="p-4 pb-2">
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search graphs..."
          class="w-full h-9 bg-muted/50 border border-input rounded-md px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
        />
      </div>
    </div>

    <!-- Graph List -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden p-2">
      <div class="text-xs font-medium text-muted-foreground px-2 py-2 uppercase tracking-wider">Graphs</div>
      
      <div v-if="loading" class="p-4 text-center text-sm text-muted-foreground">
        Loading...
      </div>
      
      <div v-else-if="filteredGraphs.length === 0" class="p-4 text-center text-sm text-muted-foreground">
        No graphs found
      </div>

      <GraphList
        v-else
        :graphs="filteredGraphs"
        :selected-id="selectedGraphId"
        @select="setSelectedGraphId"
      />
    </div>

  </aside>
</template>