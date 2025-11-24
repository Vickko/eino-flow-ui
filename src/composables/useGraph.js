import { ref } from 'vue';

const selectedGraphId = ref(null);
const selectedNode = ref(null);

export function useGraph() {
  const setSelectedGraphId = (id) => {
    selectedGraphId.value = id;
    selectedNode.value = null;
  };

  const setSelectedNode = (node) => {
    selectedNode.value = node;
  };

  return {
    selectedGraphId,
    setSelectedGraphId,
    selectedNode,
    setSelectedNode,
  };
}