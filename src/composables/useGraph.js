import { ref } from 'vue';

const selectedGraphId = ref(null);
const selectedNode = ref(null);
const nodeExecutionResults = ref({});

export function useGraph() {
  const setSelectedGraphId = (id) => {
    selectedGraphId.value = id;
    selectedNode.value = null;
  };

  const setSelectedNode = (node) => {
    selectedNode.value = node;
  };

  const setNodeExecutionResult = (nodeKey, result) => {
    // 创建新对象以确保触发响应性
    nodeExecutionResults.value = {
      ...nodeExecutionResults.value,
      [nodeKey]: result
    };
  };

  const clearExecutionResults = () => {
    nodeExecutionResults.value = {};
  };

  return {
    selectedGraphId,
    setSelectedGraphId,
    selectedNode,
    setSelectedNode,
    nodeExecutionResults,
    setNodeExecutionResult,
    clearExecutionResults,
  };
}