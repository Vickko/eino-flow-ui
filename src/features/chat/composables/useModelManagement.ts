import { ref, watch } from 'vue'
import { getModelIcon } from '@/shared/utils/modelIcons'

// 模型接口定义
export interface Model {
  id: string
  name: string
  description: string
  icon: string
}

// localStorage 存储的 key
const STORAGE_KEY = 'chat_models'

// 默认模型列表
const DEFAULT_MODELS: Model[] = [
  {
    id: 'deepseek-v3.2',
    name: 'DeepSeek V3.2',
    description: 'Advanced reasoning model',
    icon: getModelIcon('deepseek-v3.2'),
  },
  {
    id: 'deepseek-v3.2-think',
    name: 'DeepSeek V3.2 Think',
    description: 'DeepSeek V3.2 with thinking capabilities',
    icon: getModelIcon('deepseek-v3.2-think'),
  },
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    description: 'Most advanced GPT model',
    icon: getModelIcon('gpt-5.2'),
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    description: 'Lightweight and fast',
    icon: getModelIcon('gpt-5-mini'),
  },
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    description: 'Most capable Claude model',
    icon: getModelIcon('claude-opus-4-6'),
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    description: 'Balanced performance',
    icon: getModelIcon('claude-sonnet-4-5'),
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    description: 'Fast and efficient',
    icon: getModelIcon('claude-haiku-4-5'),
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    description: 'Latest Gemini preview',
    icon: getModelIcon('gemini-3-pro-preview'),
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    description: 'Ultra-fast responses',
    icon: getModelIcon('gemini-3-flash-preview'),
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    description: 'Gemini 3 Pro with image support',
    icon: getModelIcon('gemini-3-pro-image-preview'),
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Nano Banana',
    description: 'Gemini 2.5 Pro with image support',
    icon: getModelIcon('gemini-2.5-flash-image'),
  },
  {
    id: 'grok-4-1-fast-non-reasoning',
    name: 'Grok 4.1 Fast',
    description: 'Fast non-reasoning mode',
    icon: getModelIcon('grok-4-1-fast-non-reasoning'),
  },
  {
    id: 'grok-4-1-fast-reasoning',
    name: 'Grok 4.1 Fast Reasoning',
    description: 'Fast with reasoning',
    icon: getModelIcon('grok-4-1-fast-reasoning'),
  },
  {
    id: 'qwen3.5-397b-a17b',
    name: 'Qwen3.5 397B A17B',
    description: 'Vision-language model with hybrid MoE architecture',
    icon: getModelIcon('qwen3.5-397b-a17b'),
  },
  {
    id: 'qwen3-vl-235b-a22b-thinking',
    name: 'Qwen3 VL 235B Thinking',
    description: 'Vision-language thinking model',
    icon: getModelIcon('qwen3-vl-235b-a22b-thinking'),
  },
  {
    id: 'glm-5',
    name: 'GLM 5',
    description: 'Advanced ChatGLM model',
    icon: getModelIcon('glm-5'),
  },
  {
    id: 'doubao-seed-2-0-pro',
    name: 'Doubao Seed 2.0 Pro',
    description: 'ByteDance flagship model',
    icon: getModelIcon('doubao-seed-2-0-pro'),
  },
  {
    id: 'kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    description: 'Deep thinking model',
    icon: getModelIcon('kimi-k2-thinking'),
  },
  {
    id: 'kimi-k2.5',
    name: 'Kimi K2.5',
    description: 'Kimi K2.5 latest release',
    icon: getModelIcon('kimi-k2.5'),
  },
  {
    id: 'minimax-m2.5',
    name: 'MiniMax M2.5',
    description: 'Advanced multimodal model',
    icon: getModelIcon('minimax-m2.5'),
  },
  {
    id: 'llama-4-maverick',
    name: 'Llama 4 Maverick',
    description: 'Meta experimental model',
    icon: getModelIcon('llama-4-maverick'),
  },
]

/**
 * 从 localStorage 加载模型列表
 */
function loadModels(): Model[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const models = JSON.parse(stored) as Model[]
      // 确保加载的模型有图标
      return models.map((model) => ({
        ...model,
        icon: model.icon || getModelIcon(model.id || model.name),
      }))
    }
  } catch (error) {
    console.error('Failed to load models from localStorage:', error)
  }
  return [...DEFAULT_MODELS]
}

/**
 * 保存模型列表到 localStorage
 */
function saveModels(models: Model[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(models))
  } catch (error) {
    console.error('Failed to save models to localStorage:', error)
  }
}

/**
 * 模型管理 composable
 */
export function useModelManagement() {
  // 模型列表
  const models = ref<Model[]>(loadModels())

  // 监听模型列表变化，自动保存到 localStorage
  watch(
    models,
    (newModels) => {
      saveModels(newModels)
    },
    { deep: true }
  )

  /**
   * 添加新模型
   */
  const addModel = (model: Omit<Model, 'icon'> & { icon?: string }): boolean => {
    // 检查 ID 是否已存在
    if (models.value.some((m) => m.id === model.id)) {
      console.warn(`Model with id "${model.id}" already exists`)
      return false
    }

    // 如果没有提供图标，根据 ID 或名称自动匹配
    const icon = model.icon || getModelIcon(model.id || model.name)

    models.value.push({
      ...model,
      icon,
    })

    return true
  }

  /**
   * 更新模型
   */
  const updateModel = (id: string, updates: Partial<Omit<Model, 'id'>>): boolean => {
    const index = models.value.findIndex((m) => m.id === id)
    if (index === -1) {
      console.warn(`Model with id "${id}" not found`)
      return false
    }

    // 如果更新了名称或 ID，重新匹配图标
    if (updates.name && !updates.icon) {
      updates.icon = getModelIcon(updates.name)
    }

    models.value[index] = {
      ...models.value[index],
      ...updates,
    } as Model

    return true
  }

  /**
   * 删除模型
   */
  const deleteModel = (id: string): boolean => {
    const index = models.value.findIndex((m) => m.id === id)
    if (index === -1) {
      console.warn(`Model with id "${id}" not found`)
      return false
    }

    models.value.splice(index, 1)
    return true
  }

  /**
   * 根据 ID 获取模型
   */
  const getModelById = (id: string): Model | undefined => {
    return models.value.find((m) => m.id === id)
  }

  /**
   * 重置为默认模型列表
   */
  const resetToDefaults = () => {
    models.value = [...DEFAULT_MODELS]
  }

  /**
   * 根据模型名称或 ID 自动建议图标
   */
  const suggestIconForModel = (nameOrId: string): string => {
    return getModelIcon(nameOrId)
  }

  /**
   * 重新排序模型
   */
  const reorderModels = (fromIndex: number, toIndex: number): boolean => {
    if (
      fromIndex < 0 ||
      fromIndex >= models.value.length ||
      toIndex < 0 ||
      toIndex >= models.value.length ||
      fromIndex === toIndex
    ) {
      return false
    }

    const [item] = models.value.splice(fromIndex, 1)
    if (!item) return false
    models.value.splice(toIndex, 0, item)
    return true
  }

  return {
    models,
    addModel,
    updateModel,
    deleteModel,
    getModelById,
    resetToDefaults,
    suggestIconForModel,
    reorderModels,
  }
}
