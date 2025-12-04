<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { Send } from 'lucide-vue-next';
import { cn } from '../../lib/utils';

const emit = defineEmits<{
  (e: 'send', text: string): void;
}>();

const input = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const isValid = computed(() => input.value.trim().length > 0);

const adjustHeight = () => {
  const textarea = textareaRef.value;
  if (textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`; // max-h-40 is 160px (10rem)
  }
};

const handleInput = () => {
  adjustHeight();
};

const handleSend = () => {
  if (!isValid.value) return;
  emit('send', input.value);
  input.value = '';
  nextTick(() => {
    adjustHeight();
  });
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};
</script>

<template>
  <div class="p-4">
    <div class="relative flex items-end gap-2 group">
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
        @click="handleSend"
        :disabled="!isValid"
        :class="cn(
          'p-2 rounded-md transition-all duration-200 flex items-center justify-center shrink-0',
          isValid
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
            : 'bg-transparent text-muted-foreground hover:bg-muted cursor-not-allowed opacity-50'
        )"
      >
        <Send class="w-4 h-4" />
      </button>
    </div>
    <div class="text-center mt-2">
      <span class="text-[10px] text-muted-foreground/50">Press Enter to send, Shift + Enter for new line</span>
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