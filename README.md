# Eino DevOps Frontend

这是一个基于 Vue 3 + Vue Flow 开发的 Eino DevOps Graph 可视化前端，完全复刻并增强了原版 `viewer.html` 的功能。

## 功能特性

- 📊 **Graph 列表展示**：实时获取并展示所有注册的 Graph。
- 🎨 **可视化拓扑图**：使用 Vue Flow 展示 Graph 的节点和连线结构。
- 🧩 **自定义节点样式**：区分 Start, End, Lambda, Graph, Chain 等不同类型的节点样式。
- 📦 **嵌套子图标识**：识别并标记包含子图的节点。
- 📐 **自动布局**：集成 Dagre 算法实现节点的自动层级布局。

## 快速开始

### 1. 启动后端服务

确保 Eino DevOps 后端服务已启动（默认端口 52538）。

```bash
# 在项目根目录运行示例后端
go run devops/debug/main.go
```

### 2. 启动前端服务

```bash
cd devops-frontend
npm install
npm run dev
```

访问 `http://localhost:5173` 即可查看。

## API 接口文档

本项目基于 Eino DevOps 提供的 HTTP API 开发。以下是根据源码分析整理的 API 文档。

### 基础信息

- **Base URL**: `http://localhost:52538/eino/devops`
- **Content-Type**: `application/json`

### 1. 获取 Graph 列表

获取当前所有已注册的 Graph 信息。

- **Endpoint**: `/debug/v1/graphs`
- **Method**: `GET`
- **Response**:

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "graphs": [
      {
        "id": "vpmwlU",
        "name": "state_graph.RegisterSimpleStateGraph:70"
      },
      // ...
    ]
  }
}
```

### 2. 获取 Graph 画布详情

获取指定 Graph 的详细节点和连线信息，用于绘制拓扑图。

- **Endpoint**: `/debug/v1/graphs/{graph_id}/canvas`
- **Method**: `GET`
- **Parameters**:
    - `graph_id`: Graph 的唯一标识符
- **Response**:

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "canvas_info": {
      "version": "1.0.0",
      "id": "cTvizS",
      "name": "graph.RegisterSimpleGraph:58",
      "nodes": [
        {
          "key": "start",
          "name": "start",
          "type": "start",
          "component_schema": { ... },
          "graph_schema": { ... } // 如果是嵌套 Graph，会有此字段
        },
        // ...
      ],
      "edges": [
        {
          "id": "x2rdjR",
          "name": "start_to_node_1",
          "source_node_key": "start",
          "target_node_key": "node_1"
        },
        // ...
      ]
    }
  }
}
```

### 3. 获取输入类型列表

获取所有可用的输入类型定义。

- **Endpoint**: `/debug/v1/input_types`
- **Method**: `GET`
- **Response**:

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "types": [
      {
        "type": "object",
        "title": "map[string]interface {}",
        "description": "",
        "additionalProperties": { ... }
      },
      // ...
    ]
  }
}
```

### 4. 创建调试线程

为指定的 Graph 创建一个新的调试线程。

- **Endpoint**: `/debug/v1/graphs/{graph_id}/threads`
- **Method**: `POST`
- **Parameters**:
    - `graph_id`: Graph 的唯一标识符
- **Body**: 输入数据对象
- **Response**:

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "thread_id": "..."
  }
}
```

### 5. 流式调试运行

在指定的调试线程中运行 Graph，并以流式方式返回执行结果。

- **Endpoint**: `/debug/v1/graphs/{graph_id}/threads/{thread_id}/stream`
- **Method**: `POST`
- **Parameters**:
    - `graph_id`: Graph 的唯一标识符
    - `thread_id`: 调试线程 ID
- **Body**: 输入数据对象
- **Response**: SSE (Server-Sent Events) 流

## 技术栈

- **Vue 3**: 渐进式 JavaScript 框架
- **Vue Flow**: 强大的流程图/节点图库
- **Dagre**: 有向无环图（DAG）的自动布局算法库
- **Axios**: HTTP 客户端
