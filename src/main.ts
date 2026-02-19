import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { config } from 'md-editor-v3'
import mermaid from 'mermaid'
import App from './App.vue'
import router from './router'

// 预加载 mermaid，解决懒加载导致的渲染不稳定问题
// 使用 default 主题，通过 CSS 控制暗黑模式样式
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
})

config({
  editorExtensions: {
    mermaid: {
      instance: mermaid,
    },
  },
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
