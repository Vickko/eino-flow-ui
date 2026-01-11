// API 响应类型
export interface ApiResponse<T = unknown> {
  code: number
  msg?: string
  data: T
}

// Graph 相关类型
export interface Graph {
  id: string
  name: string
}

export interface GraphListResponse {
  graphs: Graph[]
}

// Canvas 相关类型
export interface ComponentSchema {
  input_type?: JsonSchema
  output_type?: JsonSchema
}

export interface GraphSchema {
  id: string
  name?: string
  input_type?: JsonSchema
}

export interface CanvasNode {
  key: string
  type: string
  component_schema?: ComponentSchema
  graph_schema?: GraphSchema
}

export interface CanvasEdge {
  id: string
  source_node_key: string
  target_node_key: string
  name?: string
}

export interface CanvasInfo {
  name: string
  version: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export interface GraphCanvasResponse {
  canvas_info: CanvasInfo
}

// Debug 相关类型
export interface DebugThreadResponse {
  thread_id: string
}

export interface DebugRunRequest {
  from_node: string
  input: string
  log_id: string
}

// 执行结果类型
export interface ExecutionMetrics {
  duration?: number
}

export interface NodeExecutionResult {
  status: 'success' | 'error'
  input: unknown
  output: unknown
  error?: unknown
  metrics: ExecutionMetrics
  timestamp: string
}

// 导航栈类型
export interface GraphNavigationItem {
  id: string
  name: string
}

// Theme 类型
export type ThemeMode = 'light' | 'dark' | 'system'

// Edge 类型
export type EdgeType = 'smoothstep' | 'default'

// JSON Schema 类型（完整版）
export interface GoDefinition {
  typeName?: string
  kind?: string
  isPtr?: boolean
  libraryRef?: {
    module?: string
    pkgPath?: string
    version?: string
  }
}

export interface JsonSchema {
  type?: string
  title?: string
  description?: string
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  anyOf?: JsonSchema[]
  enum?: string[]
  default?: unknown
  propertyOrder?: string[]
  additionalProperties?: JsonSchema
  required?: string[]
  goDefinition?: GoDefinition
}

// Input Types 响应
export interface InputTypesResponse {
  types: string[]
}

// SSE 数据类型
export interface SSEDataContent {
  node_key: string
  status?: string
  input?: unknown
  output?: unknown
  error?: unknown
  metrics?: ExecutionMetrics
}

export interface SSEData {
  type: string
  content: SSEDataContent
}

// Vue Flow 相关类型 - 已迁移到各组件中使用 @vue-flow/core 的原生类型

// Log 类型
export interface LogEntry {
  timestamp: string
  fullMessage: string
  message: string
}

// Chat 相关类型
export interface ChatMessageRequest {
  session?: string
  role: 'user' | 'system' | 'assistant' | 'tool'
  content: string
  model?: string
  thinking?: boolean
  client?: string
  name?: string
  tool_call_id?: string
  tool_name?: string
}

export interface ToolCall {
  id: string
  type: string
  function: {
    name: string
    arguments: string
  }
}

export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface ResponseMeta {
  finish_reason: string
  usage?: TokenUsage
}

export interface ChatMessageResponse {
  role: 'assistant'
  content: string
  tool_calls?: ToolCall[]
  reasoning_content?: string
  response_meta?: ResponseMeta
}

// Session 相关类型
export interface Session {
  id: string // 会话树 ID (tree_xxx)
  title: string
  last_active_session_id: string // 最后活跃分支 ID
  last_message: string
  created_at: string
  updated_at: string
}

export interface SessionListResponse {
  sessions: Session[]
}

export interface SessionMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  reasoning_content?: string
  model?: string // 仅助手消息有值
}

export interface SessionMessagesResponse {
  messages: SessionMessage[]
}
