<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { ImagePlus, Send, Square, X } from 'lucide-vue-next'
import { cn } from '../../lib/utils'

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
}>()

const emit = defineEmits<{
  (e: 'send', payload: { text: string; attachments?: ImageAttachment[] }): void
  (e: 'stop'): void
}>()

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const selectedImages = ref<SelectedImage[]>([])

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

const openImagePicker = () => {
  imageInputRef.value?.click()
}

const handleImageSelect = async (event: Event) => {
  const inputEl = event.target as HTMLInputElement
  const files = Array.from(inputEl.files || [])
  if (files.length === 0) return

  const remainCount = MAX_IMAGE_COUNT - selectedImages.value.length
  const picked = files.slice(0, Math.max(remainCount, 0))
  if (picked.length === 0) {
    inputEl.value = ''
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

  inputEl.value = ''
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
</script>

<template>
  <div class="px-4 pt-1 pb-0.5">
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
        class="inline-flex items-center gap-1 rounded-md border border-border/50 bg-muted/20 px-2 py-1 text-xs"
      >
        <span class="max-w-[160px] truncate">{{ image.name }}</span>
        <button class="rounded p-0.5 hover:bg-muted/50" @click="removeImage(image.id)">
          <X class="h-3 w-3" />
        </button>
      </div>
    </div>

    <div class="relative flex items-end gap-2 group">
      <button
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
