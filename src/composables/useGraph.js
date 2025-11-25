import { ref, computed } from 'vue';

const selectedGraphId = ref(null);
const selectedNode = ref(null);
const nodeExecutionResults = ref({});
// 图导航历史栈：存储 { id, name } 对象
const graphNavigationStack = ref([]);

export function useGraph() {
  const setSelectedGraphId = (id, name = null, isNewNavigation = true) => {
    selectedGraphId.value = id;
    selectedNode.value = null;

    // 如果提供了 name，更新导航栈
    if (name !== null && id) {
      // 如果是新导航（从列表选择），清空栈并重新开始
      if (isNewNavigation) {
        graphNavigationStack.value = [{ id, name }];
      } else {
        // 如果是子图导航，添加到栈中
        const existingIndex = graphNavigationStack.value.findIndex(item => item.id === id);
        if (existingIndex === -1) {
          // 不在栈中，添加到栈顶
          graphNavigationStack.value.push({ id, name });
        } else {
          // 已在栈中，截断到该位置（回退导航）
          graphNavigationStack.value = graphNavigationStack.value.slice(0, existingIndex + 1);
        }
      }
    } else if (id === '' || id === null) {
      // 清空选择时，清空导航栈
      graphNavigationStack.value = [];
    }
  };

  const navigateToSubgraph = (subgraphSchema) => {
    if (!subgraphSchema || !subgraphSchema.id) {
      console.error('Invalid subgraph schema:', subgraphSchema);
      return;
    }

    // 导航到子图，传入子图名称，isNewNavigation = false 表示这是子图导航
    setSelectedGraphId(subgraphSchema.id, subgraphSchema.name || subgraphSchema.id, false);
  };

  const navigateBack = () => {
    if (graphNavigationStack.value.length > 1) {
      // 移除当前图
      graphNavigationStack.value.pop();
      // 导航到上一个图
      const previousGraph = graphNavigationStack.value[graphNavigationStack.value.length - 1];
      selectedGraphId.value = previousGraph.id;
      selectedNode.value = null;
    }
  };

  const canNavigateBack = computed(() => graphNavigationStack.value.length > 1);

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

  const clearNavigationStack = () => {
    graphNavigationStack.value = [];
  };

  return {
    selectedGraphId,
    setSelectedGraphId,
    selectedNode,
    setSelectedNode,
    nodeExecutionResults,
    setNodeExecutionResult,
    clearExecutionResults,
    navigateToSubgraph,
    navigateBack,
    canNavigateBack,
    graphNavigationStack,
    clearNavigationStack,
  };
}