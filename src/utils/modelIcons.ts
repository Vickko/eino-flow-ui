// 模型图标匹配工具
import logoGPT from '../assets/logo_GPT.svg'
import logoClaude from '../assets/logo_claude2.svg'
import logoGemini from '../assets/logo_gemini.svg'
import logoMeta from '../assets/logo_meta.svg'
import logoGrok from '../assets/logo_grok.svg'
import logoDeepseek from '../assets/logo_deepseek.svg'
import logoDoubao from '../assets/logo_doubao.svg'
import logoKimi from '../assets/logo_kimi.svg'
import logoMinimax from '../assets/logo_minimax.svg'
import logoQwen from '../assets/logo_qwen.svg'
import logoZhipu from '../assets/logo_zhipuai.svg'

// 图标类型
export type ModelIcon = string

// 模型关键词与图标的映射关系
const iconKeywords: Record<string, { keywords: string[]; icon: string }> = {
  gpt: {
    keywords: ['gpt', 'openai', 'chatgpt', 'turbo', 'davinci', 'o1', 'o3'],
    icon: logoGPT,
  },
  claude: {
    keywords: ['claude', 'anthropic', 'opus', 'sonnet', 'haiku'],
    icon: logoClaude,
  },
  gemini: {
    keywords: ['gemini', 'google', 'bard', 'palm'],
    icon: logoGemini,
  },
  meta: {
    keywords: ['llama', 'meta', 'facebook', 'codellama'],
    icon: logoMeta,
  },
  grok: {
    keywords: ['grok', 'xai', 'x.ai'],
    icon: logoGrok,
  },
  deepseek: {
    keywords: ['deepseek', 'deep-seek', 'deep_seek'],
    icon: logoDeepseek,
  },
  doubao: {
    keywords: ['doubao', '豆包', 'bytedance', '字节', 'skylark', '云雀'],
    icon: logoDoubao,
  },
  kimi: {
    keywords: ['kimi', 'moonshot', '月之暗面', 'mooncake'],
    icon: logoKimi,
  },
  minimax: {
    keywords: ['minimax', 'abab', 'mini-max'],
    icon: logoMinimax,
  },
  qwen: {
    keywords: ['qwen', '千问', '通义', 'alibaba', '阿里', 'tongyi'],
    icon: logoQwen,
  },
  zhipu: {
    keywords: ['zhipu', 'glm', 'chatglm', '智谱', 'cogview', 'codegeex'],
    icon: logoZhipu,
  },
}

/**
 * 根据模型名称或 ID 匹配对应的图标
 * @param modelNameOrId - 模型的名称或 ID
 * @returns 匹配的图标路径，如果没有匹配则返回默认图标
 */
export function getModelIcon(modelNameOrId: string): ModelIcon {
  if (!modelNameOrId) {
    return logoGPT // 默认图标
  }

  const lowerModel = modelNameOrId.toLowerCase()

  // 遍历所有图标配置，寻找匹配的关键词
  for (const config of Object.values(iconKeywords)) {
    if (config.keywords.some((keyword) => lowerModel.includes(keyword))) {
      return config.icon
    }
  }

  // 如果没有匹配，返回默认图标
  return logoGPT
}

/**
 * 获取所有可用的图标及其关键词
 */
export function getAvailableIcons(): Array<{ name: string; icon: string; keywords: string[] }> {
  return Object.entries(iconKeywords).map(([name, config]) => ({
    name,
    icon: config.icon,
    keywords: config.keywords,
  }))
}

/**
 * 根据关键词建议图标
 * @param text - 输入的文本（模型名称或描述）
 * @returns 建议的图标路径
 */
export function suggestIcon(text: string): ModelIcon {
  return getModelIcon(text)
}
