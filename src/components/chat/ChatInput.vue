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
  <div class="p-4 bg-background/80 backdrop-blur-xl border-t border-border/40">
    <div class="relative flex items-end gap-2 p-2 bg-muted/30 backdrop-blur-md rounded-xl border border-border/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200">
      <textarea
        ref="textareaRef"
        v-model="input"
        rows="1"
        class="flex-1 bg-transparent border-0 focus:ring-0 resize-none py-3 px-3 max-h-40 min-h-[44px] leading-relaxed text-sm placeholder:text-muted-foreground/70 scrollbar-hide"
        placeholder="Type a message..."
        @input="handleInput"
        @keydown="handleKeydown"
      ></textarea>
      
      <button
        @click="handleSend"
        :disabled="!isValid"
        :class="cn(
          'p-2 mb-1 rounded-lg transition-all duration-200 flex items-center justify-center',
          isValid 
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm' 
            : 'bg-transparent text-muted-foreground hover:bg-muted cursor-not-allowed opacity-50'
        )"
      >
        <Send class="w-5 h-5" />
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