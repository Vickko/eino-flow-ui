<script setup>
defineProps({
  graphs: {
    type: Array,
    default: () => []
  },
  selectedId: {
    type: String,
    default: ''
  }
})

defineEmits(['select'])
</script>

<template>
  <div class="space-y-1 mt-1">
    <div
      v-for="graph in graphs"
      :key="graph.id"
      @click="selectedId === graph.id ? $emit('select', '') : $emit('select', graph.id)"
      class="relative px-3 py-2 rounded-r-md text-sm font-medium cursor-pointer transition-all duration-200 ease-out truncate border-l-2"
      :class="[
        selectedId === graph.id
          ? 'bg-primary/10 text-primary border-primary'
          : 'border-transparent text-muted-foreground hover:bg-primary/5 hover:text-foreground hover:translate-x-1'
      ]"
      :title="graph.name"
    >
      {{ graph.name }}
      <!-- Glowing effect for active state -->
      <div v-if="selectedId === graph.id" class="absolute left-0 top-0 bottom-0 w-0.5 bg-primary shadow-[0_0_10px_2px_rgba(var(--primary),0.5)]"></div>
    </div>
  </div>
</template>