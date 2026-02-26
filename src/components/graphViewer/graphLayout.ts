import dagre from 'dagre'
import type { CanvasNode as TCanvasNode, EdgeType } from '@/shared/types'

export interface FlowNodeInput {
  id: string
  label: string
  type: string
  data: TCanvasNode
}

export interface FlowNode extends FlowNodeInput {
  position: { x: number; y: number }
  selected?: boolean
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  label?: string
  type: EdgeType
  animated: boolean
  style: Record<string, string | number>
  labelStyle: Record<string, string | number>
}

export type FlowElement = FlowNode | FlowEdge

export function layoutElements(
  nodes: FlowNodeInput[],
  edges: FlowEdge[],
  direction: 'LR' | 'TB' | 'RL' | 'BT' = 'LR'
): FlowElement[] {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: direction })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 240, height: 150 })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  return [
    ...nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id)
      return {
        ...node,
        position: { x: nodeWithPosition.x, y: nodeWithPosition.y },
      }
    }),
    ...edges,
  ]
}

