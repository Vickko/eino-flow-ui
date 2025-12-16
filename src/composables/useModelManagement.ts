import { ref, watch } from 'vue';
import { getModelIcon } from '../utils/modelIcons';

// 模型接口定义
export interface Model {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// localStorage 存储的 key
const STORAGE_KEY = 'chat_models';

// 默认模型列表
const DEFAULT_MODELS: Model[] = [
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    description: 'Most advanced GPT model',
    icon: getModelIcon('gpt-5.2')
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    description: 'Lightweight and fast',
    icon: getModelIcon('gpt-5-mini')
  },
  {
    id: 'claude-opus-4-5',
    name: 'Claude Opus 4.5',
    description: 'Most capable Claude model',
    icon: getModelIcon('claude-opus-4-5')
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    description: 'Balanced performance',
    icon: getModelIcon('claude-sonnet-4-5')
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    description: 'Fast and efficient',
    icon: getModelIcon('claude-haiku-4-5')
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    description: 'Latest Gemini preview',
    icon: getModelIcon('gemini-3-pro-preview')
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Ultra-fast responses',
    icon: getModelIcon('gemini-2.5-flash')
  }
];

/**
 * 从 localStorage 加载模型列表
 */
function loadModels(): Model[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const models = JSON.parse(stored) as Model[];
      // 确保加载的模型有图标
      return models.map(model => ({
        ...model,
        icon: model.icon || getModelIcon(model.id || model.name)
      }));
    }
  } catch (error) {
    console.error('Failed to load models from localStorage:', error);
  }
  return [...DEFAULT_MODELS];
}

/**
 * 保存模型列表到 localStorage
 */
function saveModels(models: Model[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
  } catch (error) {
    console.error('Failed to save models to localStorage:', error);
  }
}

/**
 * 模型管理 composable
 */
export function useModelManagement() {
  // 模型列表
  const models = ref<Model[]>(loadModels());

  // 监听模型列表变化，自动保存到 localStorage
  watch(
    models,
    (newModels) => {
      saveModels(newModels);
    },
    { deep: true }
  );

  /**
   * 添加新模型
   */
  const addModel = (model: Omit<Model, 'icon'> & { icon?: string }): boolean => {
    // 检查 ID 是否已存在
    if (models.value.some(m => m.id === model.id)) {
      console.warn(`Model with id "${model.id}" already exists`);
      return false;
    }

    // 如果没有提供图标，根据 ID 或名称自动匹配
    const icon = model.icon || getModelIcon(model.id || model.name);

    models.value.push({
      ...model,
      icon
    });

    return true;
  };

  /**
   * 更新模型
   */
  const updateModel = (id: string, updates: Partial<Omit<Model, 'id'>>): boolean => {
    const index = models.value.findIndex(m => m.id === id);
    if (index === -1) {
      console.warn(`Model with id "${id}" not found`);
      return false;
    }

    // 如果更新了名称或 ID，重新匹配图标
    if (updates.name && !updates.icon) {
      updates.icon = getModelIcon(updates.name);
    }

    models.value[index] = {
      ...models.value[index],
      ...updates
    } as Model;

    return true;
  };

  /**
   * 删除模型
   */
  const deleteModel = (id: string): boolean => {
    const index = models.value.findIndex(m => m.id === id);
    if (index === -1) {
      console.warn(`Model with id "${id}" not found`);
      return false;
    }

    models.value.splice(index, 1);
    return true;
  };

  /**
   * 根据 ID 获取模型
   */
  const getModelById = (id: string): Model | undefined => {
    return models.value.find(m => m.id === id);
  };

  /**
   * 重置为默认模型列表
   */
  const resetToDefaults = () => {
    models.value = [...DEFAULT_MODELS];
  };

  /**
   * 根据模型名称或 ID 自动建议图标
   */
  const suggestIconForModel = (nameOrId: string): string => {
    return getModelIcon(nameOrId);
  };

  /**
   * 重新排序模型
   */
  const reorderModels = (fromIndex: number, toIndex: number): boolean => {
    if (fromIndex < 0 || fromIndex >= models.value.length ||
        toIndex < 0 || toIndex >= models.value.length ||
        fromIndex === toIndex) {
      return false;
    }

    const item = models.value.splice(fromIndex, 1)[0]!;
    models.value.splice(toIndex, 0, item);
    return true;
  };

  return {
    models,
    addModel,
    updateModel,
    deleteModel,
    getModelById,
    resetToDefaults,
    suggestIconForModel,
    reorderModels
  };
}
