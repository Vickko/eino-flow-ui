import { computed, nextTick, ref, watch, type Ref } from 'vue'
import { createDebugThread, fetchGraphCanvas, streamDebugRun, useGraph } from '@/features/graph'
import type { CanvasNode, JsonSchema, JsonValue, LogEntry, SSEData } from '@/shared/types'

interface UseBottomPanelResult {
  selectedGraphId: Ref<string | null>
  inputJson: Ref<string>
  logs: Ref<LogEntry[]>
  isRunning: Ref<boolean>
  status: Ref<string>
  statusColor: Ref<string>
  canvasNodes: Ref<CanvasNode[]>
  selectedFromNode: Ref<string>

  hasSelectedGraph: Ref<boolean>

  setLogsContainer: (el: HTMLElement | null) => void

  runDebug: () => Promise<void>
  clearLogs: () => void
  copyLogs: () => Promise<void>
  resetToDefault: () => void
}

export function useBottomPanel(): UseBottomPanelResult {
  const {
    selectedGraphId,
    selectedNode,
    setSelectedNode,
    setNodeExecutionResult,
    clearExecutionResults,
    nodeExecutionResults,
  } = useGraph()

  const inputJson = ref('{\n  "query": "hello"\n}')
  const logs = ref<LogEntry[]>([])
  const isRunning = ref(false)
  const status = ref('Ready')
  const statusColor = ref('bg-green-500')
  const canvasNodes = ref<CanvasNode[]>([])
  const selectedFromNode = ref('')

  // Child component registers the element through this setter.
  const logsContainer = ref<HTMLElement | null>(null)
  const setLogsContainer = (el: HTMLElement | null): void => {
    logsContainer.value = el
  }

  const typewriteQueue = ref<LogEntry[]>([])
  const isTyping = ref(false)
  const isInternalUpdate = ref(false)

  const manuallyModifiedInputs = ref(new Map<string, string>())
  const useDefaultTemplate = ref(false)
  const isSystemUpdate = ref(false)

  const hasSelectedGraph = computed(() => !!selectedGraphId.value)

  const scrollToBottom = (): void => {
    nextTick(() => {
      if (logsContainer.value) {
        logsContainer.value.scrollTop = logsContainer.value.scrollHeight
      }
    })
  }

  const typewriteLog = (logEntry: LogEntry): Promise<void> => {
    return new Promise((resolve) => {
      let cursor = 0
      const totalLength = logEntry.fullMessage.length
      const charsPerFrame = 20

      const type = (): void => {
        if (cursor >= totalLength) {
          resolve()
          return
        }

        const nextCursor = Math.min(cursor + charsPerFrame, totalLength)
        logEntry.message += logEntry.fullMessage.substring(cursor, nextCursor)
        cursor = nextCursor

        scrollToBottom()

        if (cursor < totalLength) {
          requestAnimationFrame(type)
        } else {
          resolve()
        }
      }

      requestAnimationFrame(type)
    })
  }

  const processTypewriteQueue = async (): Promise<void> => {
    if (isTyping.value || typewriteQueue.value.length === 0) {
      return
    }

    isTyping.value = true

    while (typewriteQueue.value.length > 0) {
      const logEntry = typewriteQueue.value.shift()
      if (logEntry) {
        await typewriteLog(logEntry)
      }
    }

    isTyping.value = false
  }

  const appendLog = (message: string): void => {
    const logEntry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      fullMessage: message,
      message: '',
    }

    logs.value.push(logEntry)
    typewriteQueue.value.push(logEntry)
    processTypewriteQueue()
  }

  const clearLogs = (): void => {
    logs.value = []
    status.value = 'Ready'
    statusColor.value = 'bg-green-500'
  }

  const copyLogs = async (): Promise<void> => {
    if (logs.value.length === 0) return

    const logsText = logs.value.map((log) => `[${log.timestamp}] ${log.message}`).join('\n')

    try {
      await navigator.clipboard.writeText(logsText)
    } catch (err) {
      console.error('Failed to copy logs:', err)
    }
  }

  const loadCanvasNodes = async (graphId: string | null): Promise<void> => {
    if (!graphId) {
      canvasNodes.value = []
      selectedFromNode.value = ''
      return
    }

    try {
      const data = await fetchGraphCanvas(graphId)
      if (data.code === 0 && data.data.canvas_info) {
        const canvas = data.data.canvas_info
        canvasNodes.value = canvas.nodes ?? []

        const startNode = canvasNodes.value.find((node) => node.type === 'start')
        selectedFromNode.value = startNode ? startNode.key : (canvasNodes.value[0]?.key ?? '')
      }
    } catch (err) {
      console.error('Failed to load canvas nodes:', err)
      canvasNodes.value = []
      selectedFromNode.value = ''
    }
  }

  const generateSampleJson = (schema: JsonSchema): string => {
    if (!schema) return '{}'

    const generate = (s: JsonSchema): unknown => {
      if (!s) return null

      if (s.anyOf && s.anyOf.length > 0 && s.anyOf[0]) {
        return generate(s.anyOf[0])
      }

      const schemaCopy = { ...s }
      if (!schemaCopy.type && schemaCopy.properties) {
        schemaCopy.type = 'object'
      }

      if (!schemaCopy.type) return null

      switch (schemaCopy.type) {
        case 'string':
          if (schemaCopy.enum && schemaCopy.enum.length > 0) {
            return schemaCopy.enum[0]
          }
          return schemaCopy.default !== undefined ? schemaCopy.default : ''

        case 'number':
          return schemaCopy.default !== undefined ? schemaCopy.default : 0

        case 'boolean':
          return schemaCopy.default !== undefined ? schemaCopy.default : false

        case 'array':
          if (schemaCopy.items) {
            const item = generate(schemaCopy.items)
            return item !== null ? [item] : []
          }
          return []

        case 'object':
          if (schemaCopy.properties) {
            const obj: Record<string, unknown> = {}
            const keys = schemaCopy.propertyOrder ?? Object.keys(schemaCopy.properties)
            keys.forEach((key) => {
              if (schemaCopy.properties?.[key]) {
                const value = generate(schemaCopy.properties[key])
                if (value !== null) {
                  obj[key] = value
                }
              }
            })
            return obj
          }
          if (schemaCopy.additionalProperties) {
            return { key: generate(schemaCopy.additionalProperties) }
          }
          return {}

        case 'interface':
          if (schemaCopy.properties) {
            const obj: Record<string, unknown> = {}
            const keys = schemaCopy.propertyOrder ?? Object.keys(schemaCopy.properties)
            keys.forEach((key) => {
              if (schemaCopy.properties?.[key]) {
                const value = generate(schemaCopy.properties[key])
                if (value !== null) {
                  obj[key] = value
                }
              }
            })
            return obj
          }
          return {}

        case 'null':
          return null

        default:
          return null
      }
    }

    const sampleData = generate(schema)
    return JSON.stringify(sampleData, null, 2)
  }

  const updateInputTemplate = (): void => {
    if (!selectedFromNode.value || !canvasNodes.value.length) {
      return
    }

    const node = canvasNodes.value.find((n) => n.key === selectedFromNode.value)
    if (!node) {
      return
    }

    isSystemUpdate.value = true

    const getDefaultTemplate = (): string | null => {
      let inputType: JsonSchema | null = null
      if (node.component_schema?.input_type) {
        inputType = node.component_schema.input_type as unknown as JsonSchema
      } else if (node.graph_schema?.input_type) {
        inputType = node.graph_schema.input_type
      }
      return inputType ? generateSampleJson(inputType) : null
    }

    if (useDefaultTemplate.value) {
      const defaultTemplate = getDefaultTemplate()
      if (defaultTemplate) {
        inputJson.value = defaultTemplate
      }
    } else if (manuallyModifiedInputs.value.has(selectedFromNode.value)) {
      inputJson.value = manuallyModifiedInputs.value.get(selectedFromNode.value) ?? ''
    } else if (nodeExecutionResults.value[selectedFromNode.value]?.input) {
      const executionInput = nodeExecutionResults.value[selectedFromNode.value]?.input
      inputJson.value =
        typeof executionInput === 'string' ? executionInput : JSON.stringify(executionInput, null, 2)
    } else {
      const defaultTemplate = getDefaultTemplate()
      if (defaultTemplate) {
        inputJson.value = defaultTemplate
      }
    }

    nextTick(() => {
      isSystemUpdate.value = false
    })
  }

  watch(
    selectedGraphId,
    (newId) => {
      loadCanvasNodes(newId)
      manuallyModifiedInputs.value.clear()
      useDefaultTemplate.value = false
    },
    { immediate: true }
  )

  watch(selectedNode, (newNode) => {
    if (isInternalUpdate.value) {
      return
    }

    if (newNode && newNode.key && canvasNodes.value.length > 0) {
      const nodeExists = canvasNodes.value.find((n) => n.key === newNode.key)
      if (nodeExists && selectedFromNode.value !== newNode.key) {
        isInternalUpdate.value = true
        selectedFromNode.value = newNode.key
        queueMicrotask(() => {
          isInternalUpdate.value = false
        })
      }
    }
  })

  watch(selectedFromNode, () => {
    useDefaultTemplate.value = false
    updateInputTemplate()

    if (isInternalUpdate.value) {
      return
    }

    if (selectedFromNode.value && canvasNodes.value.length > 0) {
      const node = canvasNodes.value.find((n) => n.key === selectedFromNode.value)
      if (node && (!selectedNode.value || selectedNode.value.key !== node.key)) {
        isInternalUpdate.value = true
        setSelectedNode(node)
        queueMicrotask(() => {
          isInternalUpdate.value = false
        })
      }
    }
  })

  watch(inputJson, (newValue) => {
    if (isSystemUpdate.value) {
      return
    }

    if (selectedFromNode.value) {
      manuallyModifiedInputs.value.set(selectedFromNode.value, newValue)
    }

    useDefaultTemplate.value = false
  })

  const resetToDefault = (): void => {
    if (!selectedFromNode.value) return

    useDefaultTemplate.value = true
    manuallyModifiedInputs.value.delete(selectedFromNode.value)
    updateInputTemplate()

    nextTick(() => {
      useDefaultTemplate.value = false
    })
  }

  const parseMaybeJson = (value: JsonValue): JsonValue => {
    if (typeof value !== 'string') return value

    try {
      return JSON.parse(value) as JsonValue
    } catch {
      return value
    }
  }

  const handleDebugEvent = (data: SSEData): void => {
    if (data.type !== 'data' || !data.content?.node_key) return

    const nodeData = data.content
    setNodeExecutionResult(nodeData.node_key, {
      status: nodeData.status === 'error' || nodeData.error ? 'error' : 'success',
      input: parseMaybeJson(nodeData.input ?? null),
      output: parseMaybeJson(nodeData.output ?? null),
      error: nodeData.error !== undefined ? parseMaybeJson(nodeData.error) : undefined,
      metrics: nodeData.metrics ?? {},
      timestamp: new Date().toISOString(),
    })
  }

  const runDebug = async (): Promise<void> => {
    if (!selectedGraphId.value) {
      appendLog('Error: No graph selected')
      return
    }

    if (!selectedFromNode.value) {
      appendLog('Error: No start node found. Please wait for canvas to load.')
      return
    }

    try {
      JSON.parse(inputJson.value)
    } catch {
      appendLog('Error: Invalid JSON input')
      return
    }

    manuallyModifiedInputs.value.delete(selectedFromNode.value)

    isRunning.value = true
    status.value = 'Running...'
    statusColor.value = 'bg-amber-500 animate-pulse'
    logs.value = []
    clearExecutionResults()
    appendLog('Starting debug session...')

    try {
      appendLog('Creating debug thread...')
      const threadRes = await createDebugThread(selectedGraphId.value, {})

      if (threadRes.code !== 0) {
        throw new Error(threadRes.msg ?? 'Failed to create thread')
      }

      const threadId = threadRes.data.thread_id
      appendLog(`Thread created: ${threadId}`)

      const debugRequest = {
        from_node: selectedFromNode.value,
        input: inputJson.value,
        log_id: `debug-${Date.now()}`,
      }

      appendLog(`Starting from node: ${selectedFromNode.value}`)
      appendLog('Streaming execution...')

      await streamDebugRun(selectedGraphId.value, threadId, debugRequest, {
        onChunk: (chunk) => {
          appendLog(chunk)
        },
        onEvent: handleDebugEvent,
      })

      appendLog('Execution finished.')
      status.value = 'Completed'
      statusColor.value = 'bg-blue-500'
    } catch (err) {
      appendLog(`Error: ${err instanceof Error ? err.message : String(err)}`)
      status.value = 'Error'
      statusColor.value = 'bg-red-500'
    } finally {
      isRunning.value = false
    }
  }

  return {
    selectedGraphId,
    inputJson,
    logs,
    isRunning,
    status,
    statusColor,
    canvasNodes,
    selectedFromNode,
    hasSelectedGraph,
    setLogsContainer,
    runDebug,
    clearLogs,
    copyLogs,
    resetToDefault,
  }
}
