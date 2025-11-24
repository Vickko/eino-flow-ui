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
      class="px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 ease-in-out truncate"
      :class="[
        selectedId === graph.id
          ? 'bg-primary/10 text-primary shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-1'
      ]"
      :title="graph.name"
    >
      {{ graph.name }}
    </div>
  </div>
</template>