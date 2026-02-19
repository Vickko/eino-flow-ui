<template>
  <Transition name="dialog-backdrop">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
      @click.self="closeDialog"
    >
      <Transition name="dialog-content">
        <div
          v-if="isOpen"
          class="bg-background/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-4xl w-full max-h-[88vh] overflow-hidden flex flex-col border-[0.5px] border-border/40"
        >
          <!-- 对话框头部 -->
          <div
            class="relative flex items-center justify-between px-6 py-5 border-b border-border/40 bg-gradient-to-br from-background/80 to-muted/30"
          >
            <div>
              <h2 class="text-xl font-semibold text-foreground flex items-center gap-2">
                模型管理
                <span
                  class="text-xs font-normal text-muted-foreground px-2 py-0.5 bg-muted/60 rounded-full"
                >
                  {{ filteredModels.length }}
                </span>
              </h2>
              <p class="text-xs text-muted-foreground mt-1">管理你的 AI 模型配置</p>
            </div>
            <button
              class="p-2 hover:bg-muted/60 rounded-xl transition-all duration-200 group"
              @click="closeDialog"
            >
              <X
                :size="20"
                class="text-muted-foreground group-hover:text-foreground transition-colors"
              />
            </button>
          </div>

          <!-- 搜索栏 -->
          <div class="px-6 pt-4 pb-3">
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70"
              />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索模型名称或 ID..."
                class="w-full pl-10 pr-4 py-2.5 text-sm bg-muted/30 border-[0.5px] border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/70"
              />
            </div>
          </div>

          <!-- 对话框内容 -->
          <div ref="scrollContainerRef" class="flex-1 overflow-y-auto px-6 pb-4 custom-scrollbar">
            <!-- 模型列表 -->
            <div class="flex flex-col gap-2">
              <TransitionGroup name="model-list" tag="div" class="flex flex-col gap-2">
                <div
                  v-for="(model, index) in filteredModels"
                  :key="model.id"
                  :style="{ '--item-index': index }"
                  :draggable="!searchQuery"
                  :class="[
                    'model-card group relative p-3 bg-gradient-to-br from-muted/40 to-muted/20 hover:from-muted/60 hover:to-muted/40 rounded-xl border-[0.5px] border-border/40 hover:border-border/60 transition-all duration-200 cursor-pointer overflow-hidden',
                    draggedIndex === index && 'opacity-50 scale-95',
                    dragOverIndex === index &&
                      draggedIndex !== index &&
                      'border-primary border-dashed',
                  ]"
                  @click="startEdit(model)"
                  @dragstart="handleDragStart($event, index)"
                  @dragend="handleDragEnd"
                  @dragover.prevent="handleDragOver($event, index)"
                  @dragleave="handleDragLeave"
                  @drop.prevent="handleDrop(index)"
                >
                  <!-- 背景装饰 -->
                  <div
                    class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  ></div>

                  <div class="relative flex items-center gap-3">
                    <!-- 拖拽手柄 -->
                    <div
                      v-if="!searchQuery"
                      class="shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                      @mousedown.stop
                    >
                      <GripVertical :size="16" />
                    </div>

                    <!-- 图标区域 -->
                    <div class="relative shrink-0">
                      <div
                        class="w-10 h-10 rounded-xl bg-background/80 border-[0.5px] border-border/40 shadow-sm overflow-hidden group-hover:scale-105 transition-all duration-200"
                      >
                        <img
                          :src="model.icon"
                          :alt="model.name"
                          class="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <!-- 内容区域 -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <h4
                          class="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors"
                        >
                          {{ model.name }}
                        </h4>
                        <span class="text-xs text-muted-foreground/60 truncate font-mono">
                          {{ model.id }}
                        </span>
                      </div>
                      <p
                        v-if="model.description"
                        class="text-xs text-muted-foreground mt-0.5 truncate"
                      >
                        {{ model.description }}
                      </p>
                    </div>

                    <!-- 操作按钮 -->
                    <div
                      class="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <button
                        class="p-1.5 hover:bg-primary/20 rounded-lg transition-all duration-200 bg-background/60 border-[0.5px] border-border/40"
                        title="编辑"
                        @click.stop="startEdit(model)"
                      >
                        <Pencil :size="14" class="text-primary" />
                      </button>
                      <button
                        class="p-1.5 hover:bg-destructive/20 rounded-lg transition-all duration-200 bg-background/60 border-[0.5px] border-border/40"
                        title="删除"
                        @click.stop="handleDelete(model.id)"
                      >
                        <Trash2 :size="14" class="text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              </TransitionGroup>
            </div>

            <!-- 空状态提示 -->
            <div
              v-if="filteredModels.length === 0 && searchQuery"
              class="flex flex-col items-center justify-center py-16 text-center"
            >
              <div class="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
                <Search :size="28" class="text-muted-foreground/50" />
              </div>
              <p class="text-sm font-medium text-muted-foreground mb-1">未找到匹配的模型</p>
              <p class="text-xs text-muted-foreground/70">尝试使用其他关键词搜索</p>
            </div>

            <!-- 添加按钮 / 添加表单（单独一行在底部） -->
            <div ref="formContainerRef" class="mt-4">
              <!-- 统一的容器，通过状态控制样式 -->
              <div
                :class="[
                  'group relative rounded-xl border transition-[background,border-color,box-shadow] duration-300 ease-out',
                  showAddForm || editingModel
                    ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30 shadow-lg'
                    : 'bg-gradient-to-r from-muted/20 via-muted/30 to-muted/20 hover:from-primary/10 hover:via-primary/15 hover:to-primary/10 border-dashed border-border/40 hover:border-primary/50 cursor-pointer',
                ]"
                @click="!showAddForm && !editingModel && openAddForm()"
              >
                <!-- 背景装饰 -->
                <div
                  v-if="!showAddForm && !editingModel"
                  class="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                ></div>

                <!-- 收起状态 - 窄条内容 -->
                <div
                  :class="[
                    'relative flex items-center justify-center gap-2 px-4 transition-all duration-300 ease-out overflow-hidden',
                    showAddForm || editingModel ? 'py-0 h-0 opacity-0' : 'py-3 opacity-100',
                  ]"
                >
                  <Plus
                    :size="18"
                    class="text-muted-foreground/70 group-hover:text-primary transition-colors shrink-0"
                  />
                  <span
                    class="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors whitespace-nowrap"
                  >
                    添加新模型
                  </span>
                </div>

                <!-- 展开状态 - 表单内容 (使用 grid 技巧实现高度过渡) -->
                <div
                  class="grid transition-[grid-template-rows] duration-300 ease-out"
                  :style="{ gridTemplateRows: showAddForm || editingModel ? '1fr' : '0fr' }"
                >
                  <div class="overflow-hidden">
                    <div class="p-6">
                      <div class="flex items-center justify-between mb-4">
                        <h3 class="text-base font-semibold text-foreground flex items-center gap-2">
                          <div
                            class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center"
                          >
                            <Pencil v-if="editingModel" :size="16" class="text-primary" />
                            <Plus v-else :size="16" class="text-primary" />
                          </div>
                          {{ editingModel ? '编辑模型' : '添加新模型' }}
                        </h3>
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- 左侧表单 -->
                        <div class="space-y-4">
                          <div>
                            <label class="block text-xs font-medium text-muted-foreground mb-1.5">
                              模型 ID <span class="text-destructive">*</span>
                            </label>
                            <input
                              v-model="formData.id"
                              :disabled="!!editingModel"
                              type="text"
                              placeholder="例如: gpt-4o, claude-3.5-sonnet"
                              class="w-full px-3 py-2.5 text-sm bg-background/60 border-[0.5px] border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all placeholder:text-muted-foreground/50 font-mono"
                              @input="onModelIdInput"
                            />
                          </div>
                          <div>
                            <label class="block text-xs font-medium text-muted-foreground mb-1.5">
                              模型名称 <span class="text-destructive">*</span>
                            </label>
                            <input
                              v-model="formData.name"
                              type="text"
                              placeholder="例如: GPT-4o, Claude 3.5 Sonnet"
                              class="w-full px-3 py-2.5 text-sm bg-background/60 border-[0.5px] border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
                            />
                          </div>
                          <div>
                            <label class="block text-xs font-medium text-muted-foreground mb-1.5">
                              描述
                            </label>
                            <textarea
                              v-model="formData.description"
                              rows="3"
                              placeholder="例如: 最新最强大的模型，适合复杂任务..."
                              class="w-full px-3 py-2.5 text-sm bg-background/60 border-[0.5px] border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50 resize-none"
                            ></textarea>
                          </div>
                        </div>

                        <!-- 右侧图标预览 -->
                        <div
                          class="flex flex-col items-center justify-center gap-4 p-6 bg-muted/30 rounded-xl border-[0.5px] border-border/30"
                        >
                          <div class="text-center">
                            <p class="text-xs font-medium text-muted-foreground mb-3">图标预览</p>
                            <div
                              v-if="formData.icon"
                              class="w-24 h-24 mx-auto rounded-2xl bg-background/80 border-[0.5px] border-border/40 shadow-lg overflow-hidden"
                            >
                              <img
                                :src="formData.icon"
                                alt="Model Icon"
                                class="w-full h-full object-cover"
                              />
                            </div>
                            <div
                              v-else
                              class="w-24 h-24 mx-auto rounded-2xl bg-muted/40 border-[0.5px] border-dashed border-border/40 flex items-center justify-center"
                            >
                              <span class="text-xs text-muted-foreground/50">无图标</span>
                            </div>
                          </div>
                          <div class="text-center">
                            <p class="text-[10px] text-muted-foreground/70 leading-relaxed">
                              根据模型 ID 自动匹配<br />
                              支持: GPT, Claude, Gemini
                            </p>
                          </div>
                        </div>
                      </div>

                      <!-- 表单按钮 -->
                      <div class="flex gap-3 mt-6">
                        <button
                          :disabled="!formData.id || !formData.name"
                          class="flex-1 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:shadow-none"
                          @click="handleSubmit"
                        >
                          {{ editingModel ? '保存修改' : '添加模型' }}
                        </button>
                        <button
                          class="px-6 py-2.5 text-sm font-medium text-foreground bg-background/60 hover:bg-muted/60 border-[0.5px] border-border/50 rounded-xl transition-all duration-200"
                          @click.stop="cancelEdit"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 对话框底部 -->
          <div
            class="flex items-center justify-between px-6 py-4 border-t border-border/40 bg-gradient-to-br from-muted/20 to-background/80 backdrop-blur-sm"
          >
            <button
              class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/40"
              @click="handleReset"
            >
              重置为默认
            </button>
            <button
              class="px-5 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              @click="closeDialog"
            >
              完成
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { X, Pencil, Trash2, Plus, Search, GripVertical } from 'lucide-vue-next'
import { useModelManagement, type Model } from '@/features/chat'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:isOpen', value: boolean): void
}>()

const {
  models,
  addModel,
  updateModel,
  deleteModel,
  resetToDefaults,
  suggestIconForModel,
  reorderModels,
} = useModelManagement()

// 搜索查询
const searchQuery = ref('')

// 拖拽状态
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

// 拖拽事件处理
const handleDragStart = (event: DragEvent, index: number) => {
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

const handleDragEnd = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}

const handleDragOver = (_event: DragEvent, index: number) => {
  dragOverIndex.value = index
}

const handleDragLeave = () => {
  dragOverIndex.value = null
}

const handleDrop = (toIndex: number) => {
  if (draggedIndex.value !== null && draggedIndex.value !== toIndex) {
    reorderModels(draggedIndex.value, toIndex)
  }
  draggedIndex.value = null
  dragOverIndex.value = null
}

// 过滤后的模型列表
const filteredModels = computed(() => {
  if (!searchQuery.value.trim()) {
    return models.value
  }

  const query = searchQuery.value.toLowerCase().trim()
  return models.value.filter(
    (model) =>
      model.name.toLowerCase().includes(query) ||
      model.id.toLowerCase().includes(query) ||
      model.description?.toLowerCase().includes(query)
  )
})

// 表单数据
const formData = ref({
  id: '',
  name: '',
  description: '',
  icon: '',
})

// 控制添加表单的显示/隐藏
const showAddForm = ref(false)

// 正在编辑的模型
const editingModel = ref<Model | null>(null)

// 滚动容器和表单的 ref
const scrollContainerRef = ref<HTMLDivElement | null>(null)
const formContainerRef = ref<HTMLDivElement | null>(null)

// ResizeObserver 实例
let resizeObserver: ResizeObserver | null = null

// 滚动到底部（即时，用于动画期间跟随）
const scrollToBottomInstant = () => {
  if (scrollContainerRef.value) {
    scrollContainerRef.value.scrollTop = scrollContainerRef.value.scrollHeight
  }
}

// 监听表单容器的高度变化
const observeFormContainer = () => {
  if (!formContainerRef.value) return

  // 清理旧的 observer
  if (resizeObserver) {
    resizeObserver.disconnect()
  }

  // 创建新的 ResizeObserver
  resizeObserver = new ResizeObserver(() => {
    scrollToBottomInstant()
  })

  // 开始观察表单容器
  resizeObserver.observe(formContainerRef.value)
}

// 停止观察
const stopObserving = () => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
}

// 监听表单显示状态
watch([showAddForm, editingModel], ([newShowAddForm, newEditingModel]) => {
  if (newShowAddForm || newEditingModel) {
    // 表单展开，开始观察
    nextTick(() => {
      observeFormContainer()
      scrollToBottomInstant()
    })
  } else {
    // 表单收起，停止观察
    stopObserving()
  }
})

// 组件卸载时清理
onUnmounted(() => {
  stopObserving()
})

// 监听模型 ID 输入，自动匹配图标
const onModelIdInput = () => {
  if (formData.value.id && !editingModel.value) {
    formData.value.icon = suggestIconForModel(formData.value.id)
  }
}

// 开始编辑
const startEdit = (model: Model) => {
  editingModel.value = model
  showAddForm.value = true // 展开表单
  formData.value = {
    id: model.id,
    name: model.name,
    description: model.description,
    icon: model.icon,
  }
}

// 取消编辑/添加
const cancelEdit = () => {
  editingModel.value = null
  showAddForm.value = false // 收起表单
  resetForm()
}

// 打开添加表单
const openAddForm = () => {
  showAddForm.value = true
}

// 提交表单
const handleSubmit = () => {
  if (!formData.value.id || !formData.value.name) {
    return
  }

  if (editingModel.value) {
    // 更新模型
    updateModel(editingModel.value.id, {
      name: formData.value.name,
      description: formData.value.description,
      icon: formData.value.icon,
    })
    editingModel.value = null
  } else {
    // 添加新模型
    const success = addModel({
      id: formData.value.id,
      name: formData.value.name,
      description: formData.value.description,
      icon: formData.value.icon,
    })

    if (!success) {
      alert('模型 ID 已存在，请使用其他 ID')
      return
    }
  }

  // 收起表单并重置
  showAddForm.value = false
  resetForm()
}

// 删除模型
const handleDelete = (id: string) => {
  if (confirm('确定要删除这个模型吗？')) {
    deleteModel(id)
  }
}

// 重置为默认
const handleReset = () => {
  if (confirm('确定要重置为默认模型列表吗？这将清除所有自定义模型。')) {
    resetToDefaults()
    cancelEdit()
  }
}

// 重置表单
const resetForm = () => {
  formData.value = {
    id: '',
    name: '',
    description: '',
    icon: '',
  }
}

// 关闭对话框
const closeDialog = () => {
  emit('close')
  emit('update:isOpen', false)
  // 延迟重置表单和搜索，等待动画完成
  setTimeout(() => {
    cancelEdit()
    searchQuery.value = ''
  }, 300)
}

// 监听 isOpen 变化
watch(
  () => props.isOpen,
  (newVal) => {
    if (!newVal) {
      cancelEdit()
      searchQuery.value = ''
    }
  }
)
</script>

<style scoped>
/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.2);
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.4);
}

/* 对话框背景动画 */
.dialog-backdrop-enter-active,
.dialog-backdrop-leave-active {
  transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
}

.dialog-backdrop-enter-from,
.dialog-backdrop-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}

/* 对话框内容动画 */
.dialog-content-enter-active,
.dialog-content-leave-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dialog-content-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(-30px);
}

.dialog-content-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}

/* 模型列表项动画 - stagger 效果 */
.model-list-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: calc(var(--item-index, 0) * 0.05s);
}

.model-list-leave-active {
  transition: all 0.3s ease-out;
}

.model-list-move {
  transition: transform 0.3s ease;
}

.model-list-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
}

.model-list-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* 模型卡片悬停效果 */
.model-card {
  position: relative;
}

.model-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, transparent 0%, hsl(var(--primary) / 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.model-card:hover::before {
  opacity: 1;
}
</style>
