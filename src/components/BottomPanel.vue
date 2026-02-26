<script setup lang="ts">
import BottomPanelInputPane from './bottomPanel/BottomPanelInputPane.vue'
import BottomPanelLogsPane from './bottomPanel/BottomPanelLogsPane.vue'
import BottomPanelToolbar from './bottomPanel/BottomPanelToolbar.vue'
import { useBottomPanel } from './bottomPanel/useBottomPanel'

const {
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
} = useBottomPanel()
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <BottomPanelToolbar
      :status="status"
      :status-color="statusColor"
      :is-running="isRunning"
      :has-selected-graph="hasSelectedGraph"
      @run="runDebug"
      @clear="clearLogs"
    />

    <!-- Content Area -->
    <div class="flex-1 flex overflow-hidden px-2 pb-2 pt-0 gap-2">
      <!-- Input Area -->
      <BottomPanelInputPane
        v-model:input-json="inputJson"
        v-model:selected-from-node="selectedFromNode"
        :canvas-nodes="canvasNodes"
        @reset="resetToDefault"
      />

      <!-- Output Area -->
      <BottomPanelLogsPane
        :logs="logs"
        :set-container="setLogsContainer"
        @copy="copyLogs"
      />
    </div>
  </div>
</template>
