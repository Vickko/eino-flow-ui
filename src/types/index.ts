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
export type ChatMessageRole = 'user' | 'system' | 'assistant' | 'tool'

export interface RunAgentInputContentPart {
  type: 'text' | 'binary'
  text?: string
  data?: string
  mimeType?: string
}

export interface RunAgentInputMessage {
  id?: string
  role: ChatMessageRole
  content: string | RunAgentInputContentPart[]
  name?: string
  toolCallId?: string
}

export interface RunAgentInput {
  threadId?: string
  runId?: string
  state?: Record<string, unknown>
  messages: RunAgentInputMessage[]
  tools?: unknown[]
  context?: unknown[]
  forwardedProps?: Record<string, unknown>
}

export interface ChatMessageRequest {
  // 兼容旧命名，当前等价于 AG-UI RunAgentInput
  threadId?: string
  role: 'user' | 'system' | 'assistant' | 'tool'
  content: string
  model?: string
  thinking?: boolean
  name?: string
  toolCallId?: string
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

export interface AgUiRunStartedEvent {
  type: 'RUN_STARTED'
  threadId: string
  runId: string
}

export interface AgUiRunFinishedEvent {
  type: 'RUN_FINISHED'
  threadId: string
  runId: string
}

export interface AgUiRunErrorEvent {
  type: 'RUN_ERROR'
  message: string
  code?: string
}

export interface AgUiTextMessageStartEvent {
  type: 'TEXT_MESSAGE_START'
  messageId: string
  role: ChatMessageRole
  parentMessageId?: string
}

export interface AgUiTextMessageDeltaEvent {
  type: 'TEXT_MESSAGE_DELTA'
  messageId: string
  delta: string
}

export interface AgUiTextMessageEndEvent {
  type: 'TEXT_MESSAGE_END'
  messageId: string
}

export interface AgUiReasoningStartEvent {
  type: 'TEXT_MESSAGE_REASONING_START'
  messageId: string
}

export interface AgUiReasoningDeltaEvent {
  type: 'TEXT_MESSAGE_REASONING_DELTA'
  messageId: string
  delta: string
}

export interface AgUiReasoningEndEvent {
  type: 'TEXT_MESSAGE_REASONING_END'
  messageId: string
}

export interface AgUiToolCallStartEvent {
  type: 'TOOL_CALL_START'
  toolCallId: string
  toolCallName?: string
  parentMessageId?: string
}

export interface AgUiToolCallArgsEvent {
  type: 'TOOL_CALL_ARGS'
  toolCallId: string
  args: unknown
  parentMessageId?: string
}

export interface AgUiToolCallEndEvent {
  type: 'TOOL_CALL_END'
  toolCallId: string
  toolCallName?: string
  parentMessageId?: string
}

export type AgUiEvent =
  | AgUiRunStartedEvent
  | AgUiRunFinishedEvent
  | AgUiRunErrorEvent
  | AgUiTextMessageStartEvent
  | AgUiTextMessageDeltaEvent
  | AgUiTextMessageEndEvent
  | AgUiReasoningStartEvent
  | AgUiReasoningDeltaEvent
  | AgUiReasoningEndEvent
  | AgUiToolCallStartEvent
  | AgUiToolCallArgsEvent
  | AgUiToolCallEndEvent

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

// 认证类型
export interface UserInfo {
  sub: string // OIDC 用户 ID
  email?: string
  name?: string
  preferred_username?: string
  [key: string]: unknown
}

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: UserInfo | null
  error: string | null
}
