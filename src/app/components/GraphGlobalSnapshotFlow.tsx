'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { Edge, Node } from 'reactflow'
import { forceCenter, forceLink, forceManyBody, forceSimulation } from 'd3-force'

import type { ChatTrace, ChatTraceEvidence } from '@/types'

const ReactFlowCanvas = dynamic(() => import('@/app/components/ReactFlowCanvas'), { ssr: false })

export type GraphPathNode = {
  element_id: string
  labels: string[]
  display_name: string
  properties?: Record<string, unknown>
}

export type GraphPathRelationship = {
  type: string
  source: string
  target: string
}

export type GraphRetrievalPathResponse = {
  hop_count: number
  nodes: GraphPathNode[]
  relationships: GraphPathRelationship[]
}

export type GraphSubgraphResponse = {
  depth: number
  nodes: GraphPathNode[]
  relationships: GraphPathRelationship[]
}

type Props = {
  trace: ChatTrace | null | undefined
  path?: GraphRetrievalPathResponse | null
  graph?: GraphSubgraphResponse | null
  className?: string
}

function normalizeTypeLabel(value: string | undefined | null) {
  return (value ?? '').trim().toLowerCase()
}

function nodeThemeForType(typeLabel: string | undefined | null): {
  background: string
  color: string
  borderColor: string
  stripeColor: string
} {
  const t = normalizeTypeLabel(typeLabel)

  // Use only existing theme tokens.
  // These map to shadcn/ui CSS variables defined in globals.
  if (t === 'person' || t === 'user' || t === 'account') {
    return {
      background: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
      borderColor: 'hsl(var(--accent))',
      stripeColor: 'hsl(var(--accent))',
    }
  }

  if (t === 'document' || t === 'doc' || t === 'policy' || t === 'control') {
    return {
      background: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
      borderColor: 'hsl(var(--secondary))',
      stripeColor: 'hsl(var(--secondary))',
    }
  }

  if (t === 'chunk' || t === 'section' || t === 'paragraph') {
    return {
      background: 'hsl(var(--muted))',
      color: 'hsl(var(--foreground))',
      borderColor: 'hsl(var(--muted-foreground))',
      stripeColor: 'hsl(var(--muted-foreground))',
    }
  }

  if (t === 'entity' || t === 'concept' || t === 'topic') {
    return {
      background: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
      borderColor: 'hsl(var(--primary))',
      stripeColor: 'hsl(var(--primary))',
    }
  }

  return {
    background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
    borderColor: 'hsl(var(--border))',
    stripeColor: 'hsl(var(--border))',
  }
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9-_:.]/g, '_')
}

function evidenceTitle(item: ChatTraceEvidence, index: number) {
  return (
    item.document?.subject ||
    item.document?.doc_id ||
    item.related_node?.display_name ||
    item.chunk_id ||
    `Evidence ${index + 1}`
  )
}

export default function GraphGlobalSnapshotFlow({ trace, path, graph, className }: Props) {
  const { nodes, edges } = useMemo(() => {
    // Prefer rendering the concrete Neo4j hop path when available.
    // This is the authoritative debug view for "Top-1".
    const evidence = trace?.evidence ?? []
    const maxEvidence = 8

    const builtNodes: Node[] = []
    const builtEdges: Edge[] = []

    // If a neighborhood subgraph is supplied, render it with a force-directed layout
    // and optionally highlight the hop-path edges.
    if (graph && graph.nodes && graph.nodes.length > 0) {
      const highlightEdgeIds = new Set<string>()
      const hopLabels = new Map<string, string>()

      if (path?.relationships?.length) {
        path.relationships.forEach((rel, index) => {
          const keyA = `${rel.source}__${rel.target}__${rel.type}`
          const keyB = `${rel.target}__${rel.source}__${rel.type}`
          highlightEdgeIds.add(keyA)
          highlightEdgeIds.add(keyB)
          hopLabels.set(keyA, `hop ${index + 1}`)
          hopLabels.set(keyB, `hop ${index + 1}`)
        })
      }

      // Create simulation nodes compatible with d3-force
      const simNodes = graph.nodes.map((n) => ({
        id: n.element_id,
        label: n.display_name,
        typeLabel: n.labels?.[0] ?? 'Node',
      }))

      const simLinks = graph.relationships
        .filter((r) => r.source && r.target)
        .map((r) => ({
          source: r.source,
          target: r.target,
          type: r.type,
        }))

      // Run a fixed number of ticks for deterministic layout.
      const simulation = forceSimulation(simNodes as any)
        .force(
          'link',
          forceLink(simLinks as any)
            .id((d: any) => d.id)
            .distance(120)
            .strength(0.8),
        )
        .force('charge', forceManyBody().strength(-500))
        .force('center', forceCenter(0, 0))
        .stop()

      for (let i = 0; i < 220; i += 1) {
        simulation.tick()
      }

      // Convert to ReactFlow nodes/edges
      const nodeById = new Set(graph.nodes.map((n) => n.element_id))

      simNodes.forEach((n: any) => {
        if (!nodeById.has(n.id)) {
          return
        }

        const labelLines = [n.label, n.typeLabel ? `(${n.typeLabel})` : null].filter(Boolean)

        const theme = nodeThemeForType(n.typeLabel)

        builtNodes.push({
          id: n.id,
          position: { x: (n.x ?? 0) * 1.2, y: (n.y ?? 0) * 1.2 },
          data: { label: labelLines.join('\n') },
          style: {
            border: `2px solid ${theme.borderColor}`,
            background: theme.background,
            color: theme.color,
            padding: 10,
            borderRadius: 12,
            width: 260,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.35,
            fontSize: 12,
            boxShadow: `inset 5px 0 0 ${theme.stripeColor}`,
          },
        })
      })

      graph.relationships.forEach((r, idx) => {
        const edgeKey = `${r.source}__${r.target}__${r.type}`
        const isHighlighted = highlightEdgeIds.has(edgeKey)
        const hopLabel = hopLabels.get(edgeKey)

        builtEdges.push({
          id: `e_${idx}_${safeId(r.type)}_${safeId(r.source)}_${safeId(r.target)}`,
          source: r.source,
          target: r.target,
          label: hopLabel ? `${hopLabel}: ${r.type.replace(/_/g, ' ')}` : r.type.replace(/_/g, ' '),
          animated: isHighlighted,
          style: {
            stroke: isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            strokeWidth: isHighlighted ? 2.5 : 1.25,
          },
          labelStyle: { fontSize: 11 },
        })
      })

      return { nodes: builtNodes, edges: builtEdges }
    }

    // If a concrete path is supplied, render it as a simple chain.
    // (Graph is usually small: Person? -> Document -> Chunk -> RelatedNode?)
    // Node ids use Neo4j element ids so edges can reference them directly.
    //
    // NOTE: We keep this layout deterministic for debugging.
    if (path && path.nodes && path.nodes.length > 0) {
      const xGap = 280
      const y = 0

      path.nodes.forEach((node, index) => {
        const typeLabel = node.labels?.[0] ?? 'Node'
        const theme = nodeThemeForType(typeLabel)
        const labelLines = [
          node.display_name,
          node.labels?.length ? `(${node.labels[0]})` : null,
        ].filter(Boolean)

        builtNodes.push({
          id: node.element_id,
          position: { x: index * xGap, y },
          data: { label: labelLines.join('\n') },
          style: {
            border: `2px solid ${theme.borderColor}`,
            background: theme.background,
            color: theme.color,
            padding: 10,
            borderRadius: 10,
            width: 260,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.35,
            fontSize: 12,
            boxShadow: `inset 5px 0 0 ${theme.stripeColor}`,
          },
        })
      })

      path.relationships?.forEach((rel, idx) => {
        builtEdges.push({
          id: `rel_${idx}_${safeId(rel.type)}`,
          source: rel.source,
          target: rel.target,
          label: rel.type.replace(/_/g, ' '),
          animated: false,
          style: { stroke: 'hsl(var(--foreground))' },
          labelStyle: { fontSize: 11 },
        })
      })

      return { nodes: builtNodes, edges: builtEdges }
    }

    const rootId = 'query'

    builtNodes.push({
      id: rootId,
      position: { x: 0, y: 0 },
      data: {
        label: `Query (${(trace?.query_type ?? 'unknown').replace(/_/g, ' ')})`,
      },
      style: {
        border: '1px solid hsl(var(--border))',
        background: 'hsl(var(--background))',
        padding: 10,
        borderRadius: 10,
        width: 220,
        fontSize: 12,
      },
    })

    evidence.slice(0, maxEvidence).forEach((item, index) => {
      const idBase = safeId(item.chunk_id ?? item.document?.doc_id ?? String(index))
      const evidenceId = `evidence_${idBase}_${index}`

      const title = evidenceTitle(item, index)
      const evidenceLabelLines = [
        `#${index + 1} ${title}`,
        item.hop_count !== undefined ? `${item.hop_count} hops` : 'hops: n/a',
        item.similarity !== undefined ? `similarity: ${item.similarity}` : null,
      ].filter(Boolean)

      builtNodes.push({
        id: evidenceId,
        position: { x: 320, y: index * 110 },
        data: { label: evidenceLabelLines.join('\n') },
        style: {
          border: '1px solid hsl(var(--border))',
          background: 'hsl(var(--muted))',
          padding: 10,
          borderRadius: 10,
          width: 360,
          whiteSpace: 'pre-wrap',
          lineHeight: 1.35,
          fontSize: 12,
        },
      })

      builtEdges.push({
        id: `edge_${rootId}_${evidenceId}`,
        source: rootId,
        target: evidenceId,
        label: `rank ${index + 1}`,
        animated: true,
        style: { stroke: 'hsl(var(--foreground))' },
        labelStyle: { fontSize: 11 },
      })

      if (item.related_node?.display_name) {
        const relatedId = `related_${safeId(item.related_node.display_name)}_${index}`
        const relatedLines = [
          item.related_node.display_name,
          item.related_node.label ? `(${item.related_node.label})` : null,
        ].filter(Boolean)

        builtNodes.push({
          id: relatedId,
          position: { x: 760, y: index * 110 },
          data: { label: relatedLines.join('\n') },
          style: {
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--background))',
            padding: 10,
            borderRadius: 10,
            width: 260,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.35,
            fontSize: 12,
          },
        })

        builtEdges.push({
          id: `edge_${evidenceId}_${relatedId}`,
          source: evidenceId,
          target: relatedId,
          label: item.relationship ? item.relationship.replace(/_/g, ' ') : 'related',
          animated: false,
          style: { stroke: 'hsl(var(--muted-foreground))' },
          labelStyle: { fontSize: 11 },
        })
      }
    })

    return { nodes: builtNodes, edges: builtEdges }
  }, [graph, path, trace])

  if (!trace && !path && !graph) {
    return (
      <div className={className ?? ''}>
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No trace available to render a retrieval flow.
        </div>
      </div>
    )
  }

  if (nodes.length === 0 || (nodes.length <= 1 && !graph && !path)) {
    return (
      <div className={className ?? ''}>
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No evidence nodes available to visualize.
        </div>
      </div>
    )
  }

  return (
    <div className={className ?? ''}>
      <ReactFlowCanvas nodes={nodes} edges={edges} height={420} />
    </div>
  )
}
