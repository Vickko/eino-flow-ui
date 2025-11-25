<script setup>
import { ref, computed, onMounted } from 'vue';
import { Sun, Moon, Monitor } from 'lucide-vue-next';
import { fetchGraphs } from '@/api';
import { useGraph } from '@/composables/useGraph';
import { useTheme } from '@/composables/useTheme';
import GraphList from '@/components/GraphList.vue';
import Logo from '@/components/Logo.vue';

const { selectedGraphId, setSelectedGraphId } = useGraph();
const { theme, cycleTheme } = useTheme();
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
  <aside class="w-64 h-full rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl flex flex-col shadow-panel overflow-hidden">
    <!-- Header / Branding -->
    <div class="p-4 border-b border-border/40 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Logo />
        <h1 class="font-bold tracking-tight text-lg text-foreground">Eino DevOps</h1>
      </div>
      <button
        @click="cycleTheme"
        class="flex items-center justify-center w-8 h-8 rounded-md hover:bg-primary/10 hover:text-primary transition-all duration-200 text-muted-foreground"
        :title="`Current: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`"
      >
        <Sun v-if="theme === 'light'" class="w-4 h-4" />
        <Moon v-else-if="theme === 'dark'" class="w-4 h-4" />
        <Monitor v-else class="w-4 h-4" />
      </button>
    </div>

    <!-- Search -->
    <div class="p-4 pb-2">
      <div class="relative group">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search graphs..."
          class="w-full h-9 bg-muted/20 border border-border/50 rounded-md px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all group-hover:border-border/80"
        />
      </div>
    </div>

    <!-- Graph List -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden p-2">
      <div class="text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider opacity-80">Graphs</div>
      
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