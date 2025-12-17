import './assets/main.css'

import { createApp } from 'vue'
import { config } from 'md-editor-v3'
import mermaid from 'mermaid'
import App from './App.vue'
import router from './router'

// 预加载 mermaid，解决懒加载导致的渲染不稳定问题
config({
  editorExtensions: {
    mermaid: {
      instance: mermaid,
    },
  },
})

const app = createApp(App)

app.use(router)

app.mount('#app')
