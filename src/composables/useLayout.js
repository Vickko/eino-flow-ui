import { ref } from 'vue';

const showSidebar = ref(true);
const showInspector = ref(true);
const showBottomPanel = ref(true);

export function useLayout() {
  return {
    showSidebar,
    showInspector,
    showBottomPanel
  };
}