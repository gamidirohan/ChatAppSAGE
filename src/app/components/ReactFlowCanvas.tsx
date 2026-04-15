'use client'

import ReactFlow, { Background, Controls, MiniMap, type Edge, type Node } from 'reactflow'
import 'reactflow/dist/style.css'

type Props = {
  nodes: Node[]
  edges: Edge[]
  height?: number
}

export default function ReactFlowCanvas({ nodes, edges, height = 420 }: Props) {
  return (
    <div className="rounded-lg border bg-background" style={{ height }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <MiniMap
          nodeColor={(node) => {
            const style = node.style as Record<string, unknown> | undefined
            const bg = style?.background
            return typeof bg === 'string' ? bg : 'hsl(var(--muted))'
          }}
        />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  )
}
