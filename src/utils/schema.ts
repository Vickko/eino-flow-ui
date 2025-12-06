import type { JsonSchema } from '@/types'

/**
 * 从 JsonSchema 中提取并格式化类型名称
 * 优先返回 Go type name，如果不存在则回退到 schema type
 */
export function formatSchemaType(schema: JsonSchema | undefined): string {
  if (!schema) return 'Any'

  // 优先使用 goDefinition 中的 typeName
  if (schema.goDefinition?.typeName) {
    return schema.goDefinition.typeName
  }

  // 如果有 title，使用 title
  if (schema.title) {
    return schema.title
  }

  // 回退到 type 字段
  if (schema.type) {
    // 格式化基础类型名称（首字母大写）
    return schema.type.charAt(0).toUpperCase() + schema.type.slice(1)
  }

  return 'Any'
}

/**
 * 获取 Go type 的简短名称（去除包路径）
 */
export function getShortTypeName(typeName: string | undefined): string {
  if (!typeName) return 'N/A'
  const parts = typeName.split('.')
  return parts[parts.length - 1] || 'N/A'
}
