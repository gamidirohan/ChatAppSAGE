'use client'

import { useEffect, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Message } from '@/types'

type GraphCount = {
  label: string
  count: number
}

type GraphSnapshot = {
  totalNodes: number
  totalRelationships: number
  nodeCounts: GraphCount[]
  relationshipCounts: GraphCount[]
}

type Props = {
  message: Message | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function normalizeGraphSnapshot(payload: any): GraphSnapshot {
  const nodeCounts = Array.isArray(payload?.node_counts)
    ? payload.node_counts.map((item: any) => ({
        label: String(item.Label ?? item.label ?? 'Unknown'),
        count: Number(item.Count ?? item.count ?? 0),
      }))
    : Object.entries(payload?.nodeCountsByType ?? {}).map(([label, count]) => ({
        label,
        count: Number(count ?? 0),
      }))

  const relationshipCounts = Array.isArray(payload?.rel_counts)
    ? payload.rel_counts.map((item: any) => ({
        label: String(item.RelationType ?? item.label ?? 'Unknown'),
        count: Number(item.Count ?? item.count ?? 0),
      }))
    : Object.entries(payload?.relationshipCountsByType ?? {}).map(([label, count]) => ({
        label,
        count: Number(count ?? 0),
      }))

  return {
    totalNodes: nodeCounts.reduce((sum: number, item: GraphCount) => sum + item.count, 0),
    totalRelationships: relationshipCounts.reduce((sum: number, item: GraphCount) => sum + item.count, 0),
    nodeCounts,
    relationshipCounts,
  }
}

function formatLabel(label: string) {
  return label.replace(/_/g, ' ')
}

export default function MessageTraceSheet({ message, open, onOpenChange }: Props) {
  const [graphSnapshot, setGraphSnapshot] = useState<GraphSnapshot | null>(null)
  const [graphError, setGraphError] = useState<string | null>(null)
  const [isLoadingGraph, setIsLoadingGraph] = useState(false)

  useEffect(() => {
    if (!open || graphSnapshot || isLoadingGraph) {
      return
    }

    let cancelled = false

    const loadGraphSnapshot = async () => {
      setIsLoadingGraph(true)
      setGraphError(null)

      try {
        const response = await fetch('/api/debug-graph')
        if (!response.ok) {
          throw new Error(`Failed to load graph snapshot (${response.status})`)
        }

        const payload = await response.json()
        if (!cancelled) {
          setGraphSnapshot(normalizeGraphSnapshot(payload))
        }
      } catch (error) {
        if (!cancelled) {
          setGraphError(error instanceof Error ? error.message : 'Failed to load graph snapshot')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingGraph(false)
        }
      }
    }

    loadGraphSnapshot()

    return () => {
      cancelled = true
    }
  }, [graphSnapshot, isLoadingGraph, open])

  const trace = message?.trace
  const evidence = trace?.evidence ?? []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-full sm:max-w-2xl p-0">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>Answer insight</SheetTitle>
            <SheetDescription>
              Review the graph evidence, retrieval path, and global graph snapshot behind this SAGE response.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-6 px-6 py-5">
              <section className="space-y-2 rounded-lg border bg-muted/20 p-4">
                <div className="text-sm font-medium">Answer</div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {message?.content || 'No answer content available.'}
                </p>
              </section>

              <section className="space-y-3">
                <div className="text-sm font-semibold">Retrieval overview</div>
                {trace ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Query type</div>
                      <div className="mt-1 font-medium">{formatLabel(trace.query_type || 'unknown')}</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Scope</div>
                      <div className="mt-1 font-medium">{trace.user_scoped ? 'User scoped' : 'Global graph'}</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Results used</div>
                      <div className="mt-1 font-medium">{trace.result_count ?? 0}</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Max hops</div>
                      <div className="mt-1 font-medium">{trace.max_hop_count ?? 0}</div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    This older SAGE answer does not have saved provenance data yet.
                  </div>
                )}
              </section>

              {trace?.retrieval_path && (
                <section className="space-y-2">
                  <div className="text-sm font-semibold">Primary retrieval path</div>
                  <div className="rounded-lg border bg-background p-4 font-mono text-xs">
                    {trace.retrieval_path}
                  </div>
                </section>
              )}

              {trace?.matched_entities && trace.matched_entities.length > 0 && (
                <section className="space-y-2">
                  <div className="text-sm font-semibold">Matched entities</div>
                  <div className="flex flex-wrap gap-2">
                    {trace.matched_entities.map((entity) => (
                      <span
                        key={entity}
                        className="rounded-full border px-3 py-1 text-xs text-muted-foreground"
                      >
                        {entity}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <div className="text-sm font-semibold">Evidence bundle</div>
                {evidence.length > 0 ? (
                  <div className="space-y-3">
                    {evidence.map((item, index) => (
                      <div key={`${item.chunk_id || 'evidence'}-${index}`} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>Rank {index + 1}</span>
                          {item.similarity !== undefined && <span>Similarity {item.similarity}</span>}
                          {item.hop_count !== undefined && <span>{item.hop_count} hops</span>}
                        </div>
                        <div className="mt-2 text-sm font-medium">
                          {item.document?.subject || item.document?.doc_id || 'Untitled evidence'}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Doc ID: {item.document?.doc_id || 'unknown'} | Sender: {item.document?.sender || 'unknown'}
                        </div>
                        {item.related_node?.display_name && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Related node: {item.related_node.display_name}
                            {item.related_node.label ? ` (${item.related_node.label})` : ''}
                          </div>
                        )}
                        {item.relationship && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Relationship: {formatLabel(item.relationship)}
                          </div>
                        )}
                        {item.retrieval_path && (
                          <div className="mt-2 rounded bg-muted/40 px-3 py-2 font-mono text-[11px]">
                            {item.retrieval_path}
                          </div>
                        )}
                        {item.chunk_summary && (
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {item.chunk_summary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No ranked evidence was captured for this answer.
                  </div>
                )}
              </section>

              {message?.thinking && message.thinking.length > 0 && (
                <section className="space-y-2">
                  <div className="text-sm font-semibold">Model reasoning notes</div>
                  <div className="rounded-lg border bg-muted/20 p-4 font-mono text-xs whitespace-pre-wrap">
                    {message.thinking.join('\n')}
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <div className="text-sm font-semibold">Global graph snapshot</div>
                {isLoadingGraph && (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Loading graph counts...
                  </div>
                )}
                {graphError && (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-red-500">
                    {graphError}
                  </div>
                )}
                {graphSnapshot && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Total nodes</div>
                        <div className="mt-1 text-lg font-semibold">{graphSnapshot.totalNodes}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Total relationships</div>
                        <div className="mt-1 text-lg font-semibold">{graphSnapshot.totalRelationships}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Top node labels</div>
                      <div className="flex flex-wrap gap-2">
                        {graphSnapshot.nodeCounts.slice(0, 6).map((item) => (
                          <span key={item.label} className="rounded-full border px-3 py-1 text-xs">
                            {item.label}: {item.count}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Top relationship types</div>
                      <div className="flex flex-wrap gap-2">
                        {graphSnapshot.relationshipCounts.slice(0, 6).map((item) => (
                          <span key={item.label} className="rounded-full border px-3 py-1 text-xs">
                            {formatLabel(item.label)}: {item.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
