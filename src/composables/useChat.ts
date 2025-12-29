import { ref, computed } from 'vue'
import { streamChatMessage } from '@/api'

// 类型定义
export interface User {
  id: string
  name: string
  avatar: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  status?: 'sending' | 'sent' | 'error' | 'streaming' // 新增 streaming 状态
  model?: string
  reasoning_content?: string
  reasoningStatus?: 'thinking' | 'done' // 思考状态：thinking=思考中，done=思考完成
  images?: string[] // 图片数据数组（base64 格式）
}

export interface Conversation {
  id: string
  title: string
  updatedAt: number
  unreadCount: number
  lastMessage?: Message
}

// Mock 对话内容 - 用于展示各种 Markdown 渲染能力
const MARKDOWN_DEMO_CONTENT = `# Markdown 渲染演示

这是一个**完整的 Markdown 渲染演示**，包含了各种常见语法和扩展功能。

---

## 1. 基础文本格式

这是普通文本。**这是粗体**，*这是斜体*，***这是粗斜体***。

~~这是删除线文本~~，这是\`行内代码\`。

> 这是一段引用文字。
> 引用可以有多行。
>
> > 还可以嵌套引用。

---

## 2. 列表

### 无序列表
- 苹果
- 香蕉
  - 小香蕉
  - 大香蕉
- 橙子

### 有序列表
1. 第一步：准备材料
2. 第二步：开始制作
3. 第三步：完成
   1. 子步骤 A
   2. 子步骤 B

### 任务列表
- [x] 已完成的任务
- [x] 另一个已完成的任务
- [ ] 待办任务
- [ ] 另一个待办任务

---

## 3. 链接与图片

### 链接
- 普通链接：[Google](https://www.google.com)
- 带标题的链接：[GitHub](https://github.com "GitHub 官网")
- 自动链接：https://www.example.com

### 图片
![示例图片](https://picsum.photos/400/200 "随机图片")

小图示例：
![小图标](https://picsum.photos/100/100)

---

## 4. 表格

| 功能 | 状态 | 优先级 |
|:-----|:----:|-------:|
| 代码高亮 | ✅ 完成 | 高 |
| Mermaid 图表 | ✅ 完成 | 高 |
| 数学公式 | ✅ 完成 | 中 |
| 任务列表 | ✅ 完成 | 低 |

---

## 5. 代码块

### JavaScript
\`\`\`javascript
// 快速排序实现
function quickSort(arr) {
  if (arr.length <= 1) return arr;

  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);

  return [...quickSort(left), ...middle, ...quickSort(right)];
}

console.log(quickSort([3, 1, 4, 1, 5, 9, 2, 6]));
\`\`\`

### TypeScript
\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  if (!response.ok) {
    throw new Error('User not found');
  }
  return response.json();
}
\`\`\`

### Python
\`\`\`python
from typing import List, Optional

class TreeNode:
    def __init__(self, val: int = 0):
        self.val = val
        self.left: Optional['TreeNode'] = None
        self.right: Optional['TreeNode'] = None

def inorder_traversal(root: Optional[TreeNode]) -> List[int]:
    """中序遍历二叉树"""
    if not root:
        return []
    return (
        inorder_traversal(root.left) +
        [root.val] +
        inorder_traversal(root.right)
    )
\`\`\`

### Go
\`\`\`go
package main

import (
    "fmt"
    "sync"
)

func main() {
    var wg sync.WaitGroup
    ch := make(chan int, 10)

    // Producer
    wg.Add(1)
    go func() {
        defer wg.Done()
        for i := 0; i < 10; i++ {
            ch <- i
        }
        close(ch)
    }()

    // Consumer
    wg.Add(1)
    go func() {
        defer wg.Done()
        for num := range ch {
            fmt.Println("Received:", num)
        }
    }()

    wg.Wait()
}
\`\`\`

### Rust
\`\`\`rust
use std::collections::HashMap;

fn main() {
    let mut scores: HashMap<String, i32> = HashMap::new();

    scores.insert(String::from("Blue"), 10);
    scores.insert(String::from("Yellow"), 50);

    for (key, value) in &scores {
        println!("{}: {}", key, value);
    }
}
\`\`\`

### SQL
\`\`\`sql
SELECT
    u.name,
    u.email,
    COUNT(o.id) as order_count,
    SUM(o.total) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) > 5
ORDER BY total_spent DESC
LIMIT 10;
\`\`\`

### Shell/Bash
\`\`\`bash
#!/bin/bash

# 批量重命名文件
for file in *.txt; do
    if [[ -f "$file" ]]; then
        newname="backup_$(date +%Y%m%d)_$file"
        mv "$file" "$newname"
        echo "Renamed: $file -> $newname"
    fi
done
\`\`\`

### YAML
\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
\`\`\`

### JSON
\`\`\`json
{
  "name": "devops-frontend",
  "version": "1.0.0",
  "dependencies": {
    "vue": "^3.5.0",
    "shiki": "^1.0.0",
    "mermaid": "^11.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build"
  }
}
\`\`\`

### Dockerfile
\`\`\`dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
\`\`\`

---

## 6. Mermaid 图表

### 流程图
\`\`\`mermaid
flowchart TD
    A[开始] --> B{用户登录?}
    B -->|是| C[显示主页]
    B -->|否| D[显示登录页]
    D --> E[输入凭证]
    E --> F{验证通过?}
    F -->|是| C
    F -->|否| G[显示错误]
    G --> D
    C --> H[结束]
\`\`\`

### 时序图
\`\`\`mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端
    participant B as 后端
    participant D as 数据库

    U->>F: 点击登录
    F->>B: POST /api/login
    B->>D: 查询用户
    D-->>B: 返回用户数据
    B-->>F: 返回 JWT Token
    F-->>U: 跳转到主页
\`\`\`

### 类图
\`\`\`mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
        +fetch()
    }
    class Cat {
        +String color
        +meow()
        +scratch()
    }
    Animal <|-- Dog
    Animal <|-- Cat
\`\`\`

### 甘特图
\`\`\`mermaid
gantt
    title 项目开发计划
    dateFormat  YYYY-MM-DD
    section 设计
    需求分析      :a1, 2024-01-01, 7d
    UI设计        :a2, after a1, 10d
    section 开发
    前端开发      :b1, after a2, 20d
    后端开发      :b2, after a2, 25d
    section 测试
    单元测试      :c1, after b1, 7d
    集成测试      :c2, after b2, 10d
\`\`\`

### 饼图
\`\`\`mermaid
pie showData
    title 技术栈占比
    "Vue.js" : 35
    "TypeScript" : 25
    "Go" : 20
    "Python" : 15
    "其他" : 5
\`\`\`

### 状态图
\`\`\`mermaid
stateDiagram-v2
    [*] --> 待处理
    待处理 --> 处理中: 开始处理
    处理中 --> 已完成: 完成
    处理中 --> 失败: 出错
    失败 --> 待处理: 重试
    已完成 --> [*]
\`\`\`

---

## 7. 数学公式

### 行内公式
- 著名的质能方程：$E = mc^2$
- 二次方程求根公式：$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$
- 欧拉公式：$e^{i\\pi} + 1 = 0$

### 块级公式

麦克斯韦方程组：

$$
\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}
$$

$$
\\nabla \\cdot \\mathbf{B} = 0
$$

薛定谔方程：

$$
i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r},t) = \\hat{H}\\Psi(\\mathbf{r},t)
$$

矩阵示例：

$$
\\begin{pmatrix}
a_{11} & a_{12} & a_{13} \\\\
a_{21} & a_{22} & a_{23} \\\\
a_{31} & a_{32} & a_{33}
\\end{pmatrix}
$$

求和与积分：

$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
$$

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

---

## 8. 特殊内容

### 水平分割线
上面的内容

---

下面的内容

### HTML 实体
&copy; 2024 | &hearts; | &rarr; | &nbsp;

### 转义字符
\\*这不是斜体\\* \\[这不是链接\\]

### 超长单行文本
下面是一段没有任何换行的超长文本，用于测试长文本的换行和溢出行为：

这是一段非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的单行中文文本，它不包含任何换行符，目的是测试文本溢出时的表现。

And this is an extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely extremely long single line of English text without any line breaks to test how the renderer handles overflow situations.

超长URL测试：https://example.com/this/is/a/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/very/long/url/path/to/test/overflow/behavior

超长代码行：\`const veryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryLongVariableName = "test";\`

---

**演示完毕！** 以上展示了 Markdown 渲染器支持的所有主要功能。`

// 思考过程演示内容
const REASONING_DEMO_CONTENT = `根据我的分析，快速排序的平均时间复杂度是 **O(n log n)**。

## 详细解释

### 时间复杂度分析

| 情况 | 时间复杂度 | 说明 |
|------|-----------|------|
| 最佳情况 | O(n log n) | 每次都能均匀分割 |
| 平均情况 | O(n log n) | 随机数据 |
| 最坏情况 | O(n²) | 已排序数组且选择首/尾元素作为基准 |

### 为什么平均是 O(n log n)？

1. **分割次数**：理想情况下，每次分割都将数组分成两半，需要 log n 次分割
2. **每次分割的工作量**：每次分割需要遍历所有元素，工作量为 O(n)
3. **总复杂度**：O(n) × O(log n) = O(n log n)

### 代码示例

\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
\`\`\`

### 空间复杂度

- **递归栈空间**：O(log n) ~ O(n)
- **原地排序版本**：O(log n)（只需要递归栈空间）`

const REASONING_DEMO_THINKING = `用户问的是快速排序的时间复杂度，让我仔细分析一下...

首先，快速排序的基本思想是分治法：
1. 选择一个基准元素（pivot）
2. 将数组分成两部分：小于基准的和大于基准的
3. 递归地对两部分进行排序

让我分析不同情况下的复杂度：

**最佳情况分析：**
- 每次分割都能将数组均匀分成两半
- 分割深度为 log₂n
- 每层需要处理 n 个元素
- 总复杂度：n × log n = O(n log n)

**最坏情况分析：**
- 当数组已经排序，且每次都选择第一个或最后一个元素作为基准
- 每次分割只能分出一个元素
- 分割深度变成 n
- 总复杂度：n × n = O(n²)

**平均情况分析：**
- 假设每次分割的位置是随机的
- 通过数学期望计算，平均分割深度接近 log n
- 因此平均复杂度为 O(n log n)

我应该用表格来清晰地展示这三种情况，并给出代码示例帮助理解。`

// 初始数据
const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    title: 'New Chat',
    updatedAt: Date.now(),
    unreadCount: 0,
  },
  {
    id: 'reasoning-demo',
    title: '思考过程演示',
    updatedAt: Date.now() - 500,
    unreadCount: 0,
  },
  {
    id: 'markdown-demo',
    title: 'Markdown 渲染演示',
    updatedAt: Date.now() - 1000,
    unreadCount: 0,
  },
]

// Mock 消息
const DEMO_MESSAGES: Message[] = [
  {
    id: 'demo-user-1',
    conversationId: 'markdown-demo',
    role: 'user',
    content: '请展示一下 Markdown 渲染的所有功能',
    timestamp: Date.now() - 60000,
    status: 'sent',
  },
  {
    id: 'demo-assistant-1',
    conversationId: 'markdown-demo',
    role: 'assistant',
    content: MARKDOWN_DEMO_CONTENT,
    timestamp: Date.now() - 59000,
    status: 'sent',
    model: 'Claude-3.5-Sonnet',
  },
]

// 思考过程演示消息
const REASONING_DEMO_MESSAGES: Message[] = [
  {
    id: 'reasoning-user-1',
    conversationId: 'reasoning-demo',
    role: 'user',
    content: '快速排序的时间复杂度是多少？请详细解释。',
    timestamp: Date.now() - 30000,
    status: 'sent',
  },
  {
    id: 'reasoning-assistant-1',
    conversationId: 'reasoning-demo',
    role: 'assistant',
    content: REASONING_DEMO_CONTENT,
    reasoning_content: REASONING_DEMO_THINKING,
    reasoningStatus: 'done',
    timestamp: Date.now() - 29000,
    status: 'sent',
    model: 'DeepSeek-R1',
  },
]

// 全局状态
const conversations = ref<Conversation[]>(INITIAL_CONVERSATIONS)
const messages = ref<Record<string, Message[]>>({
  c1: [],
  'reasoning-demo': REASONING_DEMO_MESSAGES,
  'markdown-demo': DEMO_MESSAGES,
})
const activeConversationId = ref<string | null>('c1')
const currentUser: User = {
  id: 'u1',
  name: 'Me',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
}

// SSE 流式传输控制
const currentAbortController = ref<AbortController | null>(null)

// 通过检查消息状态来判断是否正在流式传输
const isStreaming = computed(() => {
  if (!activeConversationId.value) return false
  const msgList = messages.value[activeConversationId.value]
  return msgList?.some((m) => m.status === 'streaming') ?? false
})

export function useChat() {
  const sendMessage = async (text: string, model?: string, thinking?: boolean) => {
    if (!activeConversationId.value) return

    const conversationId = activeConversationId.value
    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      status: 'sending',
      model,
    }

    // 添加用户消息
    if (!messages.value[conversationId]) {
      messages.value[conversationId] = []
    }
    messages.value[conversationId].push(newMessage)

    // 更新会话最后一条消息
    const convIndex = conversations.value.findIndex((c) => c.id === conversationId)
    if (convIndex !== -1) {
      const conv = conversations.value[convIndex]
      if (conv) {
        conv.lastMessage = newMessage
        conv.updatedAt = Date.now()
        // 移到顶部
        conversations.value.splice(convIndex, 1)
        conversations.value.unshift(conv)
      }
    }

    // 标记用户消息为已发送
    newMessage.status = 'sent'

    // 创建 AI 回复消息占位符（streaming 状态）
    const aiMessageId = (Date.now() + 1).toString()
    const aiMessage: Message = {
      id: aiMessageId,
      conversationId,
      role: 'assistant',
      content: '', // 初始为空，流式填充
      reasoning_content: '', // 思考内容初始为空
      images: [], // 图片数组初始为空
      timestamp: Date.now(),
      status: 'streaming', // 流式接收中
      model: model,
    }

    if (messages.value[conversationId]) {
      messages.value[conversationId].push(aiMessage)
    }

    // 创建 AbortController 用于中断请求
    const abortController = new AbortController()
    currentAbortController.value = abortController

    try {
      // 使用流式 API
      await streamChatMessage(
        {
          session: conversationId,
          role: 'user',
          content: text,
          model: model,
          thinking,
        },
        {
          onReasoning: (chunk: string) => {
            // 流式追加思考内容
            const msgList = messages.value[conversationId]
            if (msgList) {
              const msg = msgList.find((m) => m.id === aiMessageId)
              if (msg) {
                msg.reasoning_content = (msg.reasoning_content || '') + chunk
                // 设置思考状态为进行中
                if (!msg.reasoningStatus) {
                  msg.reasoningStatus = 'thinking'
                }
              }
            }
          },
          onImage: (base64data: string) => {
            // 添加图片数据
            const msgList = messages.value[conversationId]
            if (msgList) {
              const msg = msgList.find((m) => m.id === aiMessageId)
              if (msg) {
                if (!msg.images) {
                  msg.images = []
                }
                msg.images.push(base64data)
                // 收到图片时，如果正在思考，标记思考完成
                if (msg.reasoningStatus === 'thinking') {
                  msg.reasoningStatus = 'done'
                }
              }
            }
          },
          onChunk: (chunk: string) => {
            // 流式追加内容
            const msgList = messages.value[conversationId]
            if (msgList) {
              const msg = msgList.find((m) => m.id === aiMessageId)
              if (msg) {
                msg.content += chunk
                // 收到 content 时，标记思考完成
                if (msg.reasoningStatus === 'thinking') {
                  msg.reasoningStatus = 'done'
                }
              }
            }
          },
          onDone: () => {
            // 流式完成，更新状态
            const msgList = messages.value[conversationId]
            if (msgList) {
              const msg = msgList.find((m) => m.id === aiMessageId)
              if (msg) {
                msg.status = 'sent'
              }
            }

            // 更新会话最后一条消息
            const convIdx = conversations.value.findIndex((c) => c.id === conversationId)
            if (convIdx !== -1) {
              const conv = conversations.value[convIdx]
              if (conv) {
                const msgList = messages.value[conversationId]
                const msg = msgList?.find((m) => m.id === aiMessageId)
                if (msg) {
                  conv.lastMessage = msg
                  conv.updatedAt = Date.now()
                }

                // 如果是新会话的第一条消息，根据内容生成标题
                if (conv.title === 'New Chat') {
                  conv.title = text.length > 30 ? text.substring(0, 30) + '...' : text
                }
              }
            }

            // 清理 AbortController
            currentAbortController.value = null
          },
          onError: (error: string) => {
            // 错误处理
            const msgList = messages.value[conversationId]
            if (msgList) {
              const msg = msgList.find((m) => m.id === aiMessageId)
              if (msg) {
                msg.status = 'error'
                msg.content = msg.content || `抱歉，发送消息时出现错误: ${error}`
              }
            }

            // 清理 AbortController
            currentAbortController.value = null
          },
        },
        abortController.signal
      )
    } catch (error) {
      console.error('Error sending message:', error)

      // 更新 AI 消息状态为错误
      const msgList = messages.value[conversationId]
      if (msgList) {
        const msg = msgList.find((m) => m.id === aiMessageId)
        if (msg) {
          // 如果是主动中断，不显示错误
          if (error instanceof Error && error.name === 'AbortError') {
            msg.status = 'sent'
            if (!msg.content) {
              msg.content = '已停止生成'
            }
          } else {
            msg.status = 'error'
            if (!msg.content) {
              msg.content = '抱歉，发送消息时出现错误。请稍后再试。'
            }
          }
        }
      }

      // 清理 AbortController
      currentAbortController.value = null
    }
  }

  const stopStreaming = () => {
    if (currentAbortController.value) {
      currentAbortController.value.abort()
      currentAbortController.value = null
    }
  }

  const createConversation = () => {
    const newId = `c${Date.now()}`
    const newConv: Conversation = {
      id: newId,
      title: 'New Chat',
      updatedAt: Date.now(),
      unreadCount: 0,
    }
    conversations.value.unshift(newConv)
    messages.value[newId] = []
    activeConversationId.value = newId
  }

  return {
    conversations,
    messages,
    activeConversationId,
    currentUser,
    sendMessage,
    createConversation,
    isStreaming,
    stopStreaming,
  }
}
