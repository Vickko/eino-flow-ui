/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'dagre' {
  export const graphlib: {
    Graph: new () => {
      setDefaultEdgeLabel: (fn: () => object) => void
      setGraph: (options: { rankdir: string }) => void
      setNode: (id: string, options: { width: number; height: number }) => void
      setEdge: (source: string, target: string) => void
      node: (id: string) => { x: number; y: number }
    }
  }
  export function layout(graph: ReturnType<typeof graphlib.Graph>): void
}
