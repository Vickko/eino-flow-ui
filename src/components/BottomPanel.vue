<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useGraph } from '../composables/useGraph'
import { createDebugThread, streamDebugRun, fetchGraphCanvas } from '../api'
import type { CanvasNode, JsonSchema, LogEntry, SSEData } from '@/types'

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
const logsContainer = ref<HTMLElement | null>(null)
const typewriteQueue = ref<LogEntry[]>([])
const isTyping = ref(false)
const isInternalUpdate = ref(false)

const manuallyModifiedInputs = ref(new Map<string, string>())
const useDefaultTemplate = ref(false)
const isSystemUpdate = ref(false)

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
      if (cursor < totalLength) {
        const nextCursor = Math.min(cursor + charsPerFrame, totalLength)
        logEntry.message += logEntry.fullMessage.substring(cursor, nextCursor)
        cursor = nextCursor

        scrollToBottom()

        if (cursor < totalLength) {
          requestAnimationFrame(type)
        } else {
          resolve()
        }
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

    let sseBuffer = ''
    await streamDebugRun(selectedGraphId.value, threadId, debugRequest, (chunk: string) => {
      appendLog(chunk)
      sseBuffer += chunk

      const events = sseBuffer.split('\n\n')
      sseBuffer = events.pop() ?? ''

      for (const event of events) {
        if (!event.trim()) continue

        const lines = event.split('\n')
        let dataContent = ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            dataContent += line.substring(6)
          } else if (line.startsWith('data:')) {
            dataContent += line.substring(5)
          } else if (dataContent && line.startsWith(':')) {
            dataContent += line.substring(1)
          }
        }

        if (!dataContent) continue

        try {
          const data = JSON.parse(dataContent) as SSEData

          if (data.type === 'data' && data.content?.node_key) {
            const nodeData = data.content

            let parsedInput: unknown = nodeData.input
            let parsedOutput: unknown = nodeData.output
            let parsedError: unknown = nodeData.error

            try {
              if (typeof nodeData.input === 'string') {
                parsedInput = JSON.parse(nodeData.input)
              }
            } catch {
              // keep original
            }

            try {
              if (typeof nodeData.output === 'string') {
                parsedOutput = JSON.parse(nodeData.output)
              }
            } catch {
              // keep original
            }

            try {
              if (typeof nodeData.error === 'string') {
                parsedError = JSON.parse(nodeData.error)
              }
            } catch {
              // keep original
            }

            setNodeExecutionResult(nodeData.node_key, {
              status: nodeData.status === 'error' || nodeData.error ? 'error' : 'success',
              input: parsedInput,
              output: parsedOutput,
              error: parsedError,
              metrics: nodeData.metrics ?? {},
              timestamp: new Date().toISOString(),
            })
          }
        } catch {
          // ignore SSE parse errors
        }
      }
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
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header / Toolbar -->
    <div class="h-12 flex items-center justify-between px-4 bg-transparent shrink-0">
      <div class="flex items-center gap-4">
        <div
          class="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/20 border border-border/20"
        >
          <h3 class="text-xs font-semibold text-foreground/80">Debug Console</h3>
        </div>
        <div class="flex items-center gap-2 px-2 py-1">
          <span class="w-1.5 h-1.5 rounded-full" :class="statusColor"></span>
          <span class="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{{
            status
          }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          :disabled="isRunning || !selectedGraphId"
          class="text-xs font-medium text-white bg-green-600/90 hover:bg-green-500 border border-green-500/30 hover:border-green-400 px-3 py-1.5 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95 shadow-[0_0_10px_rgba(34,197,94,0.15)]"
          @click="runDebug"
        >
          <svg v-if="!isRunning" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clip-rule="evenodd"
            />
          </svg>
          <svg v-else class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Run
        </button>
        <button
          class="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted/20 border border-transparent hover:border-border/20 transition-all duration-200 active:scale-95"
          @click="clearLogs"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 flex overflow-hidden px-2 pb-2 pt-0 gap-2">
      <!-- Input Area -->
      <div
        class="w-1/2 flex flex-col rounded-lg border border-border/30 bg-muted/20 overflow-hidden"
      >
        <div
          class="bg-muted/20 px-3 py-2 border-b border-border/10 flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground font-mono font-medium">Input (JSON)</span>
            <!-- Reset Button -->
            <button
              :disabled="!selectedFromNode"
              class="text-[10px] p-1 rounded bg-muted/40 hover:bg-muted border border-border/30 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
              title="重置为默认模板"
              @click="resetToDefault"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
          <!-- Node Selector -->
          <div class="flex items-center gap-2">
            <label class="text-[10px] text-muted-foreground font-medium">From Node:</label>
            <select
              v-model="selectedFromNode"
              class="text-[10px] px-2 py-0.5 rounded bg-muted border border-border/30 text-foreground font-mono focus:outline-none focus:border-primary/50 transition-colors"
              :disabled="!canvasNodes.length"
            >
              <option v-if="!canvasNodes.length" value="">--</option>
              <option v-for="node in canvasNodes" :key="node.key" :value="node.key">
                {{ node.key }} ({{ node.type }})
              </option>
            </select>
          </div>
        </div>
        <textarea
          v-model="inputJson"
          class="flex-1 w-full p-3 font-mono text-xs text-foreground bg-transparent resize-none focus:outline-none focus:bg-muted/10 transition-colors placeholder:text-muted-foreground/40"
          placeholder='{ "key": "value" }'
          spellcheck="false"
        ></textarea>
      </div>

      <!-- Output Area -->
      <div
        class="w-1/2 flex flex-col rounded-lg border border-border/30 bg-muted/20 overflow-hidden"
      >
        <div
          class="bg-muted/20 px-3 py-2 border-b border-border/10 text-xs text-muted-foreground font-mono font-medium flex justify-between items-center"
        >
          <span>Output / Logs</span>
          <div class="flex items-center gap-2">
            <span
              v-if="logs.length"
              class="text-[10px] opacity-60 bg-muted/30 px-1.5 py-0.5 rounded-full"
              >{{ logs.length }}</span
            >
            <button
              :disabled="logs.length === 0"
              class="p-1 rounded bg-muted/40 hover:bg-muted border border-border/30 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
              title="复制日志"
              @click="copyLogs"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
        </div>
        <div
          ref="logsContainer"
          class="flex-1 p-3 font-mono text-xs text-muted-foreground overflow-y-auto space-y-1"
        >
          <div v-if="logs.length === 0" class="text-muted-foreground/50 italic px-1">
            Waiting for execution...
          </div>
          <div
            v-for="(log, index) in logs"
            :key="index"
            class="flex gap-2 hover:bg-muted/10 rounded px-2 py-0.5 -mx-1 transition-colors"
          >
            <span class="text-muted-foreground/60 shrink-0 select-none">[{{ log.timestamp }}]</span>
            <span class="break-all whitespace-pre-wrap">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
