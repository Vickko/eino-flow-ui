import { ref } from 'vue';

const showSidebar = ref(true);
const showInspector = ref(true);
const showBottomPanel = ref(true);
const edgeType = ref('smoothstep'); // 'smoothstep' (折线) or 'default' (曲线/贝塞尔)

export function useLayout() {
  const toggleEdgeType = () => {
    edgeType.value = edgeType.value === 'smoothstep' ? 'default' : 'smoothstep';
  };

  return {
    showSidebar,
    showInspector,
    showBottomPanel,
    edgeType,
    toggleEdgeType
  };
}