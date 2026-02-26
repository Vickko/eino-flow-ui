import { computed, nextTick, onUnmounted, ref, watch, type Ref } from 'vue'
import { createDebugThread, fetchGraphCanvas, streamDebugRun, useGraph } from '@/features/graph'
import type { CanvasNode, JsonSchema, JsonValue, LogEntry, SSEData } from '@/shared/types'
import { isApiClientError } from '@/shared/api/errors'

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
  const typewriteVersion = ref(0)
  const isInternalUpdate = ref(false)

  const manuallyModifiedInputs = ref(new Map<string, string>())
  const useDefaultTemplate = ref(false)
  const isSystemUpdate = ref(false)

  const hasSelectedGraph = computed(() => !!selectedGraphId.value)

  // Avoid calling nextTick on every animation frame when logs are streaming.
  let scrollScheduled = false
  let lastScrollAt = 0
  const scrollToBottom = (): void => {
    if (scrollScheduled) return
    scrollScheduled = true

    requestAnimationFrame(() => {
      scrollScheduled = false
      const now = Date.now()
      if (now - lastScrollAt < 50) return
      lastScrollAt = now

      nextTick(() => {
        if (logsContainer.value) {
          logsContainer.value.scrollTop = logsContainer.value.scrollHeight
        }
      })
    })
  }

  const typewriteLog = (logEntry: LogEntry, version: number): Promise<void> => {
    return new Promise((resolve) => {
      let cursor = 0
      const totalLength = logEntry.fullMessage.length
      const charsPerFrame = 20

      const type = (): void => {
        if (version !== typewriteVersion.value) {
          resolve()
          return
        }

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
    const version = typewriteVersion.value

    while (typewriteQueue.value.length > 0) {
      if (version !== typewriteVersion.value) {
        break
      }

      const logEntry = typewriteQueue.value.shift()
      if (logEntry) {
        await typewriteLog(logEntry, version)
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

  const resetTypewriter = (): void => {
    typewriteVersion.value += 1
    typewriteQueue.value = []
    isTyping.value = false
  }

  const debugAbortController = ref<AbortController | null>(null)
  const debugRunVersion = ref(0)

  onUnmounted(() => {
    debugAbortController.value?.abort()
    debugAbortController.value = null
    resetTypewriter()
  })

  const clearLogs = (): void => {
    logs.value = []
    resetTypewriter()
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
    // Latest-wins guard to prevent fast switching from showing stale canvas nodes.
    // Also ensures selectedFromNode can change even if next graph has the same "start" key.
    const requestId = ++loadCanvasNodesRequestId

    if (!graphId) {
      canvasNodes.value = []
      selectedFromNode.value = ''
      return
    }

    try {
      selectedFromNode.value = ''

      const data = await fetchGraphCanvas(graphId)
      if (requestId !== loadCanvasNodesRequestId) return

      if (data.code === 0 && data.data.canvas_info) {
        const canvas = data.data.canvas_info
        canvasNodes.value = canvas.nodes ?? []

        const startNode = canvasNodes.value.find((node) => node.type === 'start')
        selectedFromNode.value = startNode ? startNode.key : (canvasNodes.value[0]?.key ?? '')
      }
    } catch (err) {
      if (requestId !== loadCanvasNodesRequestId) return
      console.error('Failed to load canvas nodes:', err)
      canvasNodes.value = []
      selectedFromNode.value = ''
    }
  }

  let loadCanvasNodesRequestId = 0

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
      // Stop any in-flight debug stream when graph changes.
      if (debugAbortController.value) {
        debugAbortController.value.abort()
        debugAbortController.value = null
      }
      debugRunVersion.value += 1

      // Reset UI state that should not leak across graphs.
      isRunning.value = false
      status.value = 'Ready'
      statusColor.value = 'bg-green-500'
      logs.value = []
      resetTypewriter()
      clearExecutionResults()

      // Force selectedFromNode watcher to run even when the new graph reuses the same key ("start").
      selectedFromNode.value = ''

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

    // Cancel any previous run before starting a new one.
    debugAbortController.value?.abort()
    const controller = new AbortController()
    debugAbortController.value = controller
    const myRunVersion = ++debugRunVersion.value
    const isStaleRun = (): boolean => myRunVersion !== debugRunVersion.value

    isRunning.value = true
    status.value = 'Running...'
    statusColor.value = 'bg-amber-500 animate-pulse'
    logs.value = []
    resetTypewriter()
    clearExecutionResults()
    appendLog('Starting debug session...')

    try {
      appendLog('Creating debug thread...')
      const threadRes = await createDebugThread(selectedGraphId.value, {})
      if (isStaleRun()) return

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

      await streamDebugRun(
        selectedGraphId.value,
        threadId,
        debugRequest,
        {
          onChunk: (chunk) => {
            if (myRunVersion !== debugRunVersion.value) return
            appendLog(chunk)
          },
          onEvent: (event) => {
            if (myRunVersion !== debugRunVersion.value) return
            handleDebugEvent(event)
          },
        },
        controller.signal
      )

      if (isStaleRun()) return
      appendLog('Execution finished.')
      status.value = 'Completed'
      statusColor.value = 'bg-blue-500'
    } catch (err) {
      if (isStaleRun()) return

      if (isApiClientError(err) && err.kind === 'abort') {
        // Aborts are expected when switching graphs or starting a new run.
        appendLog('Cancelled.')
        status.value = 'Cancelled'
        statusColor.value = 'bg-slate-500'
      } else {
        appendLog(`Error: ${err instanceof Error ? err.message : String(err)}`)
        status.value = 'Error'
        statusColor.value = 'bg-red-500'
      }
    } finally {
      if (myRunVersion === debugRunVersion.value) {
        isRunning.value = false
        debugAbortController.value = null
      }
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
