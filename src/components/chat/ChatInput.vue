<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { ImagePlus, Send, Square, X } from 'lucide-vue-next'
import { cn } from '@/shared/lib/utils'

interface ImageAttachment {
  mimeType: string
  data: string
  name?: string
}

interface SelectedImage extends ImageAttachment {
  id: string
  size: number
}

const MAX_IMAGE_COUNT = 4
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_TOTAL_IMAGE_SIZE = 10 * 1024 * 1024

const props = defineProps<{
  isStreaming?: boolean
  showUploadButton?: boolean
  enableDropZone?: boolean
}>()

const emit = defineEmits<{
  (e: 'send', payload: { text: string; attachments?: ImageAttachment[] }): void
  (e: 'stop'): void
}>()

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const selectedImages = ref<SelectedImage[]>([])
const isDragOver = ref(false)

const isValid = computed(() => input.value.trim().length > 0 || selectedImages.value.length > 0)
const totalImageSize = computed(() =>
  selectedImages.value.reduce((total, image) => total + image.size, 0)
)

const adjustHeight = () => {
  const textarea = textareaRef.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px` // max-h-40 is 160px (10rem)
  }
}

const handleInput = () => {
  adjustHeight()
}

const formatImageSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('读取图片失败'))
        return
      }
      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

const canUploadImages = () =>
  !props.isStreaming &&
  selectedImages.value.length < MAX_IMAGE_COUNT &&
  totalImageSize.value < MAX_TOTAL_IMAGE_SIZE

const openImagePicker = () => {
  if (!canUploadImages()) return
  imageInputRef.value?.click()
}

const addImageFiles = async (files: File[]) => {
  if (files.length === 0 || !canUploadImages()) return
  const remainCount = MAX_IMAGE_COUNT - selectedImages.value.length
  const picked = files.slice(0, Math.max(remainCount, 0))
  if (picked.length === 0) {
    return
  }

  let currentTotal = totalImageSize.value
  for (const file of picked) {
    if (!file.type.startsWith('image/')) continue
    if (file.size > MAX_IMAGE_SIZE) continue
    if (currentTotal + file.size > MAX_TOTAL_IMAGE_SIZE) continue
    try {
      const base64 = await readFileAsBase64(file)
      selectedImages.value.push({
        id: `${file.name}-${file.lastModified}-${selectedImages.value.length}`,
        name: file.name,
        mimeType: file.type,
        data: base64,
        size: file.size,
      })
      currentTotal += file.size
    } catch {
      // skip broken file
    }
  }
}

const handleImageSelect = async (event: Event) => {
  const inputEl = event.target as HTMLInputElement
  const files = Array.from(inputEl.files || [])
  await addImageFiles(files)

  inputEl.value = ''
}

const handleDragOver = (event: DragEvent) => {
  if (props.enableDropZone === false) return
  if (!event.dataTransfer?.types.includes('Files')) return
  event.preventDefault()
  if (!canUploadImages()) {
    isDragOver.value = false
    return
  }
  isDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
  if (props.enableDropZone === false) return
  if (!event.currentTarget) return
  const currentTarget = event.currentTarget as HTMLElement
  const relatedTarget = event.relatedTarget as Node | null
  if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
    isDragOver.value = false
  }
}

const handleDrop = async (event: DragEvent) => {
  if (props.enableDropZone === false) return
  if (!event.dataTransfer?.types.includes('Files')) return
  event.preventDefault()
  isDragOver.value = false
  if (!canUploadImages()) return
  const files = Array.from(event.dataTransfer?.files || [])
  await addImageFiles(files)
}

const removeImage = (id: string) => {
  selectedImages.value = selectedImages.value.filter((item) => item.id !== id)
}

const handleSend = () => {
  if (!isValid.value) return
  emit('send', {
    text: input.value,
    attachments: selectedImages.value.map(({ mimeType, data, name }) => ({
      mimeType,
      data,
      name,
    })),
  })
  input.value = ''
  selectedImages.value = []
  nextTick(() => {
    adjustHeight()
  })
}

const handleStop = () => {
  emit('stop')
}

const handleButtonClick = () => {
  // 如果正在流式传输，点击停止；否则发送消息
  if (props.isStreaming) {
    handleStop()
  } else {
    handleSend()
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  // 如果正在流式传输，Enter 键也停止生成
  if (props.isStreaming && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    handleStop()
    return
  }

  // 检查是否处于输入法组合状态，避免在选择候选词时误发送
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    handleSend()
  }
}

defineExpose({
  openImagePicker,
  addImageFiles,
})
</script>

<template>
  <div
    class="px-4 pt-1 pb-0.5 rounded-lg transition-colors"
    :class="isDragOver ? 'bg-primary/5' : ''"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <input
      ref="imageInputRef"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif"
      multiple
      class="hidden"
      @change="handleImageSelect"
    />

    <div v-if="selectedImages.length > 0" class="mb-2 flex flex-wrap gap-2">
      <div
        v-for="image in selectedImages"
        :key="image.id"
        class="relative w-36 overflow-hidden rounded-md border border-border/50 bg-muted/20"
      >
        <div class="flex h-24 w-full items-center justify-center bg-black/5 px-1 py-1">
          <img
            :src="`data:${image.mimeType};base64,${image.data}`"
            :alt="image.name || '待发送图片'"
            class="max-h-full max-w-full object-contain"
          />
        </div>
        <div class="px-2 py-1">
          <p class="truncate text-[11px] text-foreground/90">{{ image.name }}</p>
          <p class="text-[10px] text-muted-foreground/80">{{ formatImageSize(image.size) }}</p>
        </div>
        <button
          type="button"
          class="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
          @click="removeImage(image.id)"
        >
          <X class="h-3 w-3" />
        </button>
      </div>
    </div>

    <div class="relative flex items-end gap-2 group">
      <button
        v-if="showUploadButton !== false"
        type="button"
        :disabled="
          isStreaming ||
          selectedImages.length >= MAX_IMAGE_COUNT ||
          totalImageSize >= MAX_TOTAL_IMAGE_SIZE
        "
        :class="
          cn(
            'p-2 rounded-md transition-all duration-200 flex items-center justify-center shrink-0',
            isStreaming ||
              selectedImages.length >= MAX_IMAGE_COUNT ||
              totalImageSize >= MAX_TOTAL_IMAGE_SIZE
              ? 'bg-transparent text-muted-foreground cursor-not-allowed opacity-50'
              : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'
          )
        "
        title="上传图片"
        @click="openImagePicker"
      >
        <ImagePlus class="w-4 h-4" />
      </button>

      <textarea
        ref="textareaRef"
        v-model="input"
        rows="1"
        class="flex-1 bg-muted/20 border border-border/50 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all group-hover:border-border/80 resize-none max-h-40 min-h-[36px] leading-relaxed scrollbar-hide"
        placeholder="Type a message..."
        @input="handleInput"
        @keydown="handleKeydown"
      ></textarea>

      <button
        :disabled="!isValid && !isStreaming"
        :class="
          cn(
            'p-2 rounded-md transition-all duration-200 flex items-center justify-center shrink-0',
            isStreaming
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm'
              : isValid
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                : 'bg-transparent text-muted-foreground hover:bg-muted cursor-not-allowed opacity-50'
          )
        "
        :title="isStreaming ? '停止生成' : '发送消息'"
        @click="handleButtonClick"
      >
        <Square v-if="isStreaming" class="w-4 h-4" />
        <Send v-else class="w-4 h-4" />
      </button>
    </div>
    <div
      v-if="isDragOver && props.enableDropZone !== false"
      class="mt-2 rounded-md border border-dashed border-primary/40 bg-primary/5 px-2 py-1 text-center text-xs text-primary/80"
    >
      松开即可上传图片
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
