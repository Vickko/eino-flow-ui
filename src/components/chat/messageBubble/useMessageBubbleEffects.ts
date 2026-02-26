import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'
import type { Message } from '@/features/chat'

// Module-level cache: used to decide whether to play entrance animation for a message.
const renderedMessageIds = new Set<string>()

export interface UseMessageBubbleEffectsOptions {
  message: Ref<Message>
  isStreaming: ComputedRef<boolean>
  hasDisplayablePayload: ComputedRef<boolean>
  isNew?: Ref<boolean | undefined>
}

export interface UseMessageBubbleEffectsResult {
  markdownContentRef: Ref<HTMLElement | null>
  bubbleRef: Ref<HTMLElement | null>
  shouldPlayEntranceAnimation: Ref<boolean>
  shouldAnimateAI: ComputedRef<boolean>
  shouldAnimateUser: ComputedRef<boolean>
}

export function useMessageBubbleEffects(
  options: UseMessageBubbleEffectsOptions
): UseMessageBubbleEffectsResult {
  const { message, isStreaming, hasDisplayablePayload, isNew } = options

  const markdownContentRef = ref<HTMLElement | null>(null)
  const bubbleRef = ref<HTMLElement | null>(null)

  // Entrance animation state (only plays the first time a message is rendered)
  const isFirstRender = !renderedMessageIds.has(message.value.id)
  renderedMessageIds.add(message.value.id)
  // If caller explicitly marks this message as not-new, do not play entrance animation.
  const shouldPlayEntranceAnimation = ref(isNew?.value === false ? false : isFirstRender)

  let copyButtonObserver: MutationObserver | null = null
  let resizeObserver: ResizeObserver | null = null
  let animationFrameId: number | null = null
  let resizeObserverDelayId: ReturnType<typeof setTimeout> | null = null

  const setupCopyButtonObserver = (): void => {
    if (!markdownContentRef.value) return

    copyButtonObserver?.disconnect()

    copyButtonObserver = new MutationObserver(() => {
      const buttons = markdownContentRef.value?.querySelectorAll('.md-editor-copy-button')
      buttons?.forEach((button) => {
        const text = button.textContent?.trim()
        if (text === '已复制！') {
          button.classList.add('copied')
        } else {
          button.classList.remove('copied')
        }
      })
    })

    copyButtonObserver.observe(markdownContentRef.value, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }

  const setupResizeObserver = (): void => {
    if (!markdownContentRef.value || !bubbleRef.value) return

    resizeObserver?.disconnect()

    const bubble = bubbleRef.value
    // Streaming: smooth height/width transitions while content grows
    bubble.style.transition = 'height 0.15s ease-out, width 0.2s ease-out'

    resizeObserver = new ResizeObserver(() => {
      if (!isStreaming.value || !bubbleRef.value) return

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }

      animationFrameId = requestAnimationFrame(() => {
        const bubble = bubbleRef.value
        if (!bubble) return

        // Temporarily remove fixed sizes to measure the real target size
        const currentHeight = bubble.style.height
        const currentWidth = bubble.style.width
        bubble.style.height = ''
        bubble.style.width = ''

        const targetHeight = bubble.scrollHeight
        const targetWidth = bubble.scrollWidth

        // Restore previous sizes first, then animate to the new ones
        if (currentHeight || currentWidth) {
          bubble.style.height = currentHeight
          bubble.style.width = currentWidth
          // Force reflow
          void bubble.offsetHeight
        }

        bubble.style.height = `${targetHeight}px`
        bubble.style.width = `${targetWidth}px`
      })
    })

    resizeObserver.observe(markdownContentRef.value)
  }

  const switchToStreamingMode = (): void => {
    // Cancel delayed observer start
    if (resizeObserverDelayId) {
      clearTimeout(resizeObserverDelayId)
      resizeObserverDelayId = null
    }

    // Stop entrance animation ASAP to avoid fighting with streaming resize animation
    shouldPlayEntranceAnimation.value = false

    if (!resizeObserver && isStreaming.value) {
      setupResizeObserver()
    }
  }

  watch(
    () => message.value.status,
    (newStatus, oldStatus) => {
      if (newStatus === 'streaming') {
        nextTick(setupResizeObserver)
        return
      }

      if (oldStatus === 'streaming') {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId)
          animationFrameId = null
        }

        if (bubbleRef.value) {
          bubbleRef.value.style.transition = ''
          bubbleRef.value.style.height = ''
          bubbleRef.value.style.width = ''
        }

        resizeObserver?.disconnect()
        resizeObserver = null
      }
    },
    { immediate: true }
  )

  // As soon as any displayable payload appears while streaming, stop the waiting dot and resize smoothly.
  watch(
    () => hasDisplayablePayload.value,
    (hasPayload, hadPayload) => {
      if (!isStreaming.value || !hasPayload || hadPayload) return

      if (resizeObserverDelayId || shouldPlayEntranceAnimation.value) {
        switchToStreamingMode()
      }
    }
  )

  onMounted(() => {
    nextTick(() => {
      setupCopyButtonObserver()

      if (!isStreaming.value) return

      // If there is an entrance animation, delay ResizeObserver to avoid interrupting the animation.
      const delay = shouldPlayEntranceAnimation.value ? 500 : 0
      if (delay > 0) {
        resizeObserverDelayId = setTimeout(() => {
          resizeObserverDelayId = null
          setupResizeObserver()
        }, delay)
      } else {
        setupResizeObserver()
      }
    })
  })

  onUnmounted(() => {
    copyButtonObserver?.disconnect()
    resizeObserver?.disconnect()

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }

    if (resizeObserverDelayId) {
      clearTimeout(resizeObserverDelayId)
    }
  })

  const shouldAnimateAI = computed(
    () => shouldPlayEntranceAnimation.value && message.value.role === 'assistant'
  )
  const shouldAnimateUser = computed(
    () => shouldPlayEntranceAnimation.value && message.value.role === 'user'
  )

  return {
    markdownContentRef,
    bubbleRef,
    shouldPlayEntranceAnimation,
    shouldAnimateAI,
    shouldAnimateUser,
  }
}
