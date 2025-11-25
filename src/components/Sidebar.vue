<script setup>
import { ref, nextTick, computed } from 'vue';
import { Sun, Moon, Monitor, Settings, Check, X, ChevronLeft } from 'lucide-vue-next';
import { useGraph } from '@/composables/useGraph';
import { useTheme } from '@/composables/useTheme';
import { useServerStatus } from '@/composables/useServerStatus';
import { useApiConfig } from '@/composables/useApiConfig';
import GraphList from '@/components/GraphList.vue';
import Logo from '@/components/Logo.vue';

const { selectedGraphId, setSelectedGraphId, graphNavigationStack, canNavigateBack, navigateBack } = useGraph();
const { theme, cycleTheme } = useTheme();
const { isOnline, checkHeartbeat } = useServerStatus();
const { apiBaseUrl, updateApiBaseUrl } = useApiConfig();
const searchQuery = ref('');

const isEditingApi = ref(false);
const tempApiUrl = ref('');
const apiInput = ref(null);

const startEditingApi = async () => {
  tempApiUrl.value = apiBaseUrl.value;
  isEditingApi.value = true;
  await nextTick();
  apiInput.value?.focus();
};

const saveApiUrl = async () => {
  if (tempApiUrl.value) {
    updateApiBaseUrl(tempApiUrl.value);
    await checkHeartbeat();
  }
  isEditingApi.value = false;
};

const cancelEditingApi = () => {
  isEditingApi.value = false;
};
</script>

<template>
  <aside class="w-64 h-full rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl flex flex-col shadow-panel overflow-hidden">
    <!-- Header / Branding -->
    <div class="p-4 border-b border-border/40 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Logo />
        <div class="flex flex-col">
          <h1 class="font-bold tracking-tight text-lg text-foreground leading-none">Eino DevOps</h1>
          <div class="flex items-center gap-1.5 mt-1">
            <div 
              class="w-2 h-2 rounded-full transition-colors duration-300" 
              :class="isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500/50'"
            ></div>
            <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-opacity duration-300" :class="{ 'opacity-50': !isOnline }">
              {{ isOnline ? 'Online' : 'Offline' }}
            </span>
          </div>
        </div>
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
      
      <GraphList
        :search-query="searchQuery"
        :selected-id="selectedGraphId"
        @select="(id, name) => setSelectedGraphId(id, name)"
      />
    </div>

    <!-- API Config -->
    <div class="p-3 border-t border-border/40 bg-muted/10">
      <div v-if="!isEditingApi" class="group flex flex-col gap-1">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">API Endpoint</span>
          <button
            @click="startEditingApi"
            class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary"
            title="Edit API URL"
          >
            <Settings class="w-3 h-3" />
          </button>
        </div>
        <div class="text-xs text-muted-foreground truncate font-mono" :title="apiBaseUrl">{{ apiBaseUrl }}</div>
      </div>

      <div v-else class="flex flex-col gap-2">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Edit API Endpoint</span>
        <input
          v-model="tempApiUrl"
          type="text"
          class="w-full h-7 bg-background border border-border rounded px-2 text-xs focus:outline-none focus:border-primary font-mono"
          @keyup.enter="saveApiUrl"
          @keyup.esc="cancelEditingApi"
          ref="apiInput"
        />
        <div class="flex items-center gap-2 justify-end">
          <button @click="cancelEditingApi" class="p-1 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded" title="Cancel">
            <X class="w-3 h-3" />
          </button>
          <button @click="saveApiUrl" class="p-1 hover:bg-green-500/10 text-muted-foreground hover:text-green-500 rounded" title="Save">
            <Check class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>

  </aside>
</template>