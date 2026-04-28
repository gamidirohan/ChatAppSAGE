'use client'

import { useEffect, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from 'reactflow'
import 'reactflow/dist/style.css'

type Props = {
  nodes: Node[]
  edges: Edge[]
  height?: number
  showMiniMap?: boolean
  miniMapSize?: number
}

export default function ReactFlowCanvas({
  nodes,
  edges,
  height = 420,
  showMiniMap = true,
  miniMapSize = 130,
}: Props) {
  // Internal state lets users drag nodes without losing positions when props change.
  const [internalNodes, setInternalNodes, onNodesChange] = useNodesState(nodes)
  const [internalEdges, setInternalEdges, onEdgesChange] = useEdgesState(edges)

  useEffect(() => {
    setInternalNodes(nodes)
  }, [nodes, setInternalNodes])

  useEffect(() => {
    setInternalEdges(edges)
  }, [edges, setInternalEdges])

  const fitViewOptions = useMemo(
    () => ({ padding: 0.2, minZoom: 0.25, maxZoom: 2.5 }),
    [],
  )

  return (
    <div className="rounded-lg border bg-background" style={{ height }}>
      <ReactFlow
        nodes={internalNodes}
        edges={internalEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnScroll
        zoomOnScroll
        panOnDrag
        selectionOnDrag
        nodeDragThreshold={0.2}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={fitViewOptions}
      >
        {showMiniMap ? (
          <MiniMap
            style={{ height: miniMapSize, width: miniMapSize }}
            nodeColor={(node) => {
              const style = node.style as Record<string, unknown> | undefined
              const bg = style?.background
              return typeof bg === 'string' ? bg : 'hsl(var(--muted))'
            }}
          />
        ) : null}
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  )
}
