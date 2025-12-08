import { ref } from 'vue'

// 共享状态：按钮是否应该展开
const isExpanded = ref(false)

export function useNavButton() {
  const handleMouseEnter = () => {
    isExpanded.value = true
  }

  const handleMouseLeave = () => {
    isExpanded.value = false
  }

  return {
    isExpanded,
    handleMouseEnter,
    handleMouseLeave
  }
}
