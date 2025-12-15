// 模型图标匹配工具
import logoGPT from '../assets/logo_GPT.svg';
import logoClaude from '../assets/logo_claude2.svg';
import logoGemini from '../assets/logo_gemini.svg';

// 图标类型
export type ModelIcon = string;

// 模型关键词与图标的映射关系
const iconKeywords: Record<string, { keywords: string[]; icon: string }> = {
  gpt: {
    keywords: ['gpt', 'openai', 'chatgpt', 'turbo'],
    icon: logoGPT
  },
  claude: {
    keywords: ['claude', 'anthropic'],
    icon: logoClaude
  },
  gemini: {
    keywords: ['gemini', 'google', 'bard'],
    icon: logoGemini
  }
};

/**
 * 根据模型名称或 ID 匹配对应的图标
 * @param modelNameOrId - 模型的名称或 ID
 * @returns 匹配的图标路径，如果没有匹配则返回默认图标
 */
export function getModelIcon(modelNameOrId: string): ModelIcon {
  if (!modelNameOrId) {
    return logoGPT; // 默认图标
  }

  const lowerModel = modelNameOrId.toLowerCase();

  // 遍历所有图标配置，寻找匹配的关键词
  for (const [key, config] of Object.entries(iconKeywords)) {
    if (config.keywords.some(keyword => lowerModel.includes(keyword))) {
      return config.icon;
    }
  }

  // 如果没有匹配，返回默认图标
  return logoGPT;
}

/**
 * 获取所有可用的图标及其关键词
 */
export function getAvailableIcons(): Array<{ name: string; icon: string; keywords: string[] }> {
  return Object.entries(iconKeywords).map(([name, config]) => ({
    name,
    icon: config.icon,
    keywords: config.keywords
  }));
}

/**
 * 根据关键词建议图标
 * @param text - 输入的文本（模型名称或描述）
 * @returns 建议的图标路径
 */
export function suggestIcon(text: string): ModelIcon {
  return getModelIcon(text);
}
