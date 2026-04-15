'use client'

import { useEffect, useState } from 'react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Message, MessageSAIAInsight, SAIAClaim, SAIAGroundingReference } from '@/types'
import GraphGlobalSnapshotFlow, { type GraphRetrievalPathResponse, type GraphSubgraphResponse } from '@/app/components/GraphGlobalSnapshotFlow'

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

function formatLabel(label?: string | null) {
  return String(label || 'unknown').replace(/_/g, ' ')
}

function formatConfidence(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'n/a'
  }
  return `${Math.round(value * 100)}%`
}

function formatTemporal(start?: string | null, granularity?: string | null) {
  if (!start) {
    return 'Not resolved'
  }
  if (granularity) {
    return `${start} (${granularity})`
  }
  return start
}

function resolveGroundingReference(claim: SAIAClaim, role: 'subject' | 'object'): SAIAGroundingReference | null {
  const matched = claim.grounding?.references?.find((reference) => reference.role === role)
  if (matched) {
    return matched
  }
  if (role === 'subject' && (claim.subject_raw || claim.subject_key)) {
    return {
      role,
      raw: claim.subject_raw,
      resolved_key: claim.subject_key,
      status: claim.resolution_status,
    }
  }
  if (role === 'object' && (claim.object_raw || claim.object_key)) {
    return {
      role,
      raw: claim.object_raw,
      resolved_key: claim.object_key,
      status: claim.resolution_status,
    }
  }
  return null
}

function formatReferenceTranslation(reference: SAIAGroundingReference | null) {
  if (!reference) {
    return 'Not available'
  }
  const raw = reference.raw || 'implicit'
  const resolved = reference.display_name || reference.resolved_key || reference.entity_id || 'unresolved'
  return `${raw} -> ${resolved}`
}

export default function MessageTraceSheet({ message, open, onOpenChange }: Props) {
  const [graphSnapshot, setGraphSnapshot] = useState<GraphSnapshot | null>(null)
  const [graphError, setGraphError] = useState<string | null>(null)
  const [isLoadingGraph, setIsLoadingGraph] = useState(false)
  const [saiaInsight, setSaiaInsight] = useState<MessageSAIAInsight | null>(null)
  const [saiaError, setSaiaError] = useState<string | null>(null)
  const [isLoadingSaia, setIsLoadingSaia] = useState(false)

  useEffect(() => {
    setSaiaInsight(null)
    setSaiaError(null)
    setIsLoadingSaia(false)
  }, [message?.id])

  const [selectedRank, setSelectedRank] = useState<'1' | '2' | '3'>('1')

  const [topPath, setTopPath] = useState<GraphRetrievalPathResponse | null>(null)
  const [topPathError, setTopPathError] = useState<string | null>(null)
  const [isLoadingTopPath, setIsLoadingTopPath] = useState(false)

  const [topGraph, setTopGraph] = useState<GraphSubgraphResponse | null>(null)
  const [topGraphError, setTopGraphError] = useState<string | null>(null)
  const [isLoadingTopGraph, setIsLoadingTopGraph] = useState(false)

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

    void loadGraphSnapshot()

    return () => {
      cancelled = true
    }
  }, [graphSnapshot, isLoadingGraph, open])

  useEffect(() => {
    if (!open || !message?.id) {
      return
    }

    let cancelled = false

    const loadSaiaInsight = async () => {
      setIsLoadingSaia(true)
      setSaiaError(null)

      try {
        const response = await fetch(`/api/messages/${message.id}/saia`, { cache: 'no-store' })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.detail || `Failed to load SAIA insight (${response.status})`)
        }
        const payload = (await response.json()) as MessageSAIAInsight
        if (!cancelled) {
          setSaiaInsight(payload)
        }
      } catch (error) {
        if (!cancelled) {
          setSaiaError(error instanceof Error ? error.message : 'Failed to load SAIA insight')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSaia(false)
        }
      }
    }

    void loadSaiaInsight()

    return () => {
      cancelled = true
    }
  }, [message?.id, open])

  const isAnswerMessage = Boolean(message?.senderId === 'sage' && message?.isAiResponse)
  const answerPayload = message?.answerPayload
  const trace = message?.trace
  const evidence = trace?.evidence ?? []

  const rankIndex = Number(selectedRank) - 1
  const topEvidence = evidence[rankIndex]
  const rankLabel = `Top-${selectedRank}`

  const hasTop1 = evidence.length >= 1
  const hasTop2 = evidence.length >= 2
  const hasTop3 = evidence.length >= 3

  useEffect(() => {
    if (!open) {
      return
    }

    const chunkId = topEvidence?.chunk_id
    if (!chunkId) {
      setTopPath(null)
      setTopPathError(null)
      setIsLoadingTopPath(false)
      return
    }

    const controller = new AbortController()

    const loadTopPath = async () => {
      setIsLoadingTopPath(true)
      setTopPathError(null)
      setTopPath(null)

      try {
        const params = new URLSearchParams({ chunk_id: chunkId })
        if (trace?.user_scoped && trace.user_id) {
          params.set('user_id', String(trace.user_id))
        }
        if (topEvidence?.relationship) {
          params.set('relationship', topEvidence.relationship)
        }
        if (topEvidence?.related_node?.id) {
          params.set('related_node_id', String(topEvidence.related_node.id))
        }

        const response = await fetch(`/api/debug-retrieval-path?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(`Failed to load ${rankLabel} path (${response.status})`)
        }

        const payload = (await response.json()) as GraphRetrievalPathResponse
        setTopPath(payload)
      } catch (error) {
        if ((error as { name?: string } | null)?.name !== 'AbortError') {
          setTopPathError(error instanceof Error ? error.message : `Failed to load ${rankLabel} path`)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingTopPath(false)
        }
      }
    }

    loadTopPath()

    return () => {
      controller.abort()
    }
    // message?.id ensures we refresh when a different answer is inspected.
  }, [open, message?.id, selectedRank, topEvidence?.chunk_id, topEvidence?.relationship, topEvidence?.related_node?.id, trace?.user_scoped, trace?.user_id])

  useEffect(() => {
    if (!open) {
      return
    }

    const chunkId = topEvidence?.chunk_id
    if (!chunkId) {
      setTopGraph(null)
      setTopGraphError(null)
      setIsLoadingTopGraph(false)
      return
    }

    const controller = new AbortController()

    const loadTopGraph = async () => {
      setIsLoadingTopGraph(true)
      setTopGraphError(null)
      setTopGraph(null)

      try {
        const params = new URLSearchParams({ chunk_id: chunkId, depth: '2' })
        const response = await fetch(`/api/debug-subgraph?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(`Failed to load ${rankLabel} subgraph (${response.status})`)
        }

        const payload = (await response.json()) as GraphSubgraphResponse
        setTopGraph(payload)
      } catch (error) {
        if ((error as { name?: string } | null)?.name !== 'AbortError') {
          setTopGraphError(error instanceof Error ? error.message : `Failed to load ${rankLabel} subgraph`)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingTopGraph(false)
        }
      }
    }

    loadTopGraph()

    return () => {
      controller.abort()
    }
  }, [open, message?.id, selectedRank, topEvidence?.chunk_id])
  const claims = saiaInsight?.claims ?? []
  const previewClaims = saiaInsight?.preview_claims ?? []
  const groundedClaims = claims.length > 0 ? claims : previewClaims
  const canonicalFacts = saiaInsight?.canonical_facts ?? []
  const replacements = saiaInsight?.replacements ?? []
  const sourceDocuments = saiaInsight?.source_documents ?? []
  const runs = saiaInsight?.runs ?? []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-full sm:max-w-2xl p-0">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{isAnswerMessage ? 'Answer insight' : 'Message insight'}</SheetTitle>
            <SheetDescription>
              {isAnswerMessage
                ? 'Review the answer provenance, SAIA claim state, and current graph snapshot behind this SAGE response.'
                : 'Review the SAIA claim extraction, canonical facts, replacements, and current graph snapshot for this message.'}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-6 px-6 py-5">
              <section className="space-y-2 rounded-lg border bg-muted/20 p-4">
                <div className="text-sm font-medium">{isAnswerMessage ? 'Answer' : 'Message'}</div>
                <p className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap">
                  {answerPayload?.summary || message?.content || 'No message content available.'}
                </p>
                {isAnswerMessage && answerPayload?.bullets && answerPayload.bullets.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {answerPayload.bullets.map((bullet, index) => (
                      <li key={`${message?.id || 'answer'}-bullet-${index}`}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </section>

              {isAnswerMessage && answerPayload && (
                <section className="space-y-3">
                  <div className="text-sm font-semibold">Answer presentation</div>
                  <div className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                        {answerPayload.mode} answer
                      </span>
                      <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                        {formatLabel(answerPayload.reason_code)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Answer explanation</div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{answerPayload.explanation}</p>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Evidence refs (advisory)
                      </div>
                      {answerPayload.evidence_refs.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {answerPayload.evidence_refs.map((reference) => (
                            <span
                              key={reference}
                              className="rounded-full border px-3 py-1 text-xs text-muted-foreground"
                            >
                              {reference}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">No advisory evidence refs were saved for this answer.</p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <div className="text-sm font-semibold">SAIA summary</div>
                {isLoadingSaia && (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Loading SAIA insight...
                  </div>
                )}
                {saiaError && (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-red-500">
                    {saiaError}
                  </div>
                )}
                {!isLoadingSaia && !saiaError && saiaInsight && (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
                        <div className="mt-1 font-medium">{formatLabel(saiaInsight.saia_status)}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Processed at</div>
                        <div className="mt-1 font-medium">{saiaInsight.saia_processed_at || 'Not recorded'}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Claims</div>
                        <div className="mt-1 font-medium">{saiaInsight.summary?.claim_count ?? 0}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Canonical facts</div>
                        <div className="mt-1 font-medium">{saiaInsight.summary?.canonical_fact_count ?? 0}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Source documents</div>
                        <div className="mt-1 font-medium">{saiaInsight.summary?.document_count ?? 0}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Replacements</div>
                        <div className="mt-1 font-medium">{saiaInsight.summary?.replacement_count ?? 0}</div>
                      </div>
                    </div>
                    {saiaInsight.saia_error && (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-red-500">
                        {saiaInsight.saia_error}
                      </div>
                    )}
                    {(saiaInsight.summary?.preview_claim_count ?? 0) > 0 && claims.length === 0 && (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        Current SAIA can ground this message, but the saved run did not persist any claims. Preview-only
                        interpretations are shown below.
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="text-sm font-semibold">Grounded interpretations</div>
                {groundedClaims.length > 0 ? (
                  <div className="space-y-3">
                    {groundedClaims.map((claim) => {
                      const subjectReference = resolveGroundingReference(claim, 'subject')
                      const objectReference = resolveGroundingReference(claim, 'object')
                      const temporalExpressions = claim.grounding?.temporal_expressions ?? []
                      const temporalStart = claim.grounding?.temporal_start ?? claim.temporal_start
                      const temporalGranularity = claim.grounding?.temporal_granularity ?? claim.temporal_granularity
                      const temporalTimezone = claim.grounding?.timezone ?? claim.timezone

                      return (
                        <div
                          key={`${claim.claim_id || claim.normalized_text || claim.source_span_text || 'grounding'}-${claim.preview_only ? 'preview' : 'persisted'}`}
                          className="rounded-lg border p-4"
                        >
                          <div className="text-sm font-medium">
                            {claim.display_text || claim.normalized_text || claim.source_span_text || 'Grounded interpretation'}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>{claim.preview_only ? 'Preview only' : 'Persisted claim'}</span>
                            {claim.claim_type && <span>{formatLabel(claim.claim_type)}</span>}
                            <span>Resolution: {formatLabel(claim.resolution_status)}</span>
                            {claim.grounding?.conversation_type && (
                              <span>Conversation: {formatLabel(claim.grounding.conversation_type)}</span>
                            )}
                          </div>
                          {claim.source_span_text && (
                            <div className="mt-2 rounded bg-muted/40 px-3 py-2 text-xs">{claim.source_span_text}</div>
                          )}
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div className="rounded border bg-muted/20 px-3 py-2">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground">Subject</div>
                              <div className="mt-1 text-sm">{formatReferenceTranslation(subjectReference)}</div>
                              {subjectReference?.status && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Status: {formatLabel(subjectReference.status)}
                                </div>
                              )}
                            </div>
                            <div className="rounded border bg-muted/20 px-3 py-2">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground">Object</div>
                              <div className="mt-1 text-sm">{formatReferenceTranslation(objectReference)}</div>
                              {objectReference?.status && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Status: {formatLabel(objectReference.status)}
                                </div>
                              )}
                            </div>
                            <div className="rounded border bg-muted/20 px-3 py-2 sm:col-span-2">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground">Temporal grounding</div>
                              <div className="mt-1 text-sm">{formatTemporal(temporalStart, temporalGranularity)}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                Expressions: {temporalExpressions.length > 0 ? temporalExpressions.join(', ') : 'None detected'}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                Anchor: {claim.grounding?.anchor_sent_at || message?.sentAt || 'unknown'} | Timezone:{' '}
                                {temporalTimezone || 'unknown'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No grounded interpretation is available for this message.
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="text-sm font-semibold">Source documents</div>
                {sourceDocuments.length > 0 ? (
                  <div className="space-y-3">
                    {sourceDocuments.map((document) => (
                      <div
                        key={document.doc_id || document.subject || 'saia-document'}
                        className="rounded-lg border p-4"
                      >
                        <div className="text-sm font-medium">{document.subject || document.doc_id || 'Untitled source'}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Doc ID: {document.doc_id || 'unknown'} | Source: {document.source || 'unknown'}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          SAIA status: {formatLabel(document.saia_status)} | Timestamp: {document.timestamp || 'unknown'}
                        </div>
                        {document.attachment_name && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Attachment: {document.attachment_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No SAIA source documents were linked to this message.
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="text-sm font-semibold">Claims</div>
                {claims.length > 0 ? (
                  <div className="space-y-3">
                    {claims.map((claim) => (
                      <div key={claim.claim_id || claim.normalized_text || 'claim'} className="rounded-lg border p-4">
                        <div className="text-sm font-medium">
                          {claim.display_text || claim.normalized_text || claim.source_span_text || 'Claim without normalized text'}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{formatLabel(claim.claim_type)}</span>
                          <span>Resolution: {formatLabel(claim.resolution_status)}</span>
                          <span>Promotion: {formatLabel(claim.promotion_status)}</span>
                          <span>Action: {formatLabel(claim.mutation_action)}</span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Subject: {claim.subject_display || claim.subject_key || 'unknown'} | Object:{' '}
                          {claim.object_display || claim.object_key || 'n/a'} | Time:{' '}
                          {formatTemporal(claim.temporal_start, claim.temporal_granularity)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Extraction: {formatConfidence(claim.extraction_confidence)} | Canonical:{' '}
                          {formatConfidence(claim.canonical_confidence)} | Source doc: {claim.source_doc_id || 'unknown'}
                        </div>
                        {claim.source_span_text && (
                          <div className="mt-2 rounded bg-muted/40 px-3 py-2 text-xs">{claim.source_span_text}</div>
                        )}
                        {claim.facts && claim.facts.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {claim.facts.map((fact) => (
                              <div
                                key={`${claim.claim_id || 'claim'}-${fact.fact_id || fact.canonical_key || 'fact'}-${fact.relation_type || 'relation'}`}
                                className="rounded border bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
                              >
                                <div>
                                  {formatLabel(fact.relation_type)}: {fact.summary || fact.canonical_key || fact.fact_id || 'Linked fact'}
                                </div>
                                <div>
                                  Status: {formatLabel(fact.status)} | Canonical key: {fact.canonical_key || 'unknown'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {previewClaims.length > 0
                      ? 'No persisted claims were extracted for this message. Preview-only grounded interpretations are shown above.'
                      : 'No claims were extracted for this message.'}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="text-sm font-semibold">Canonical facts</div>
                {canonicalFacts.length > 0 ? (
                  <div className="space-y-3">
                    {canonicalFacts.map((fact) => (
                      <div key={fact.fact_id || fact.canonical_key || 'fact'} className="rounded-lg border p-4">
                        <div className="text-sm font-medium">
                          {fact.display_summary || fact.summary || fact.canonical_key || fact.fact_id}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{formatLabel(fact.claim_type)}</span>
                          <span>Status: {formatLabel(fact.status)}</span>
                          <span>Confidence: {formatConfidence(fact.confidence)}</span>
                          <span>Support count: {fact.support_count ?? 0}</span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Canonical key: {fact.canonical_key || 'unknown'} | Subject:{' '}
                          {fact.subject_display || fact.subject_key || 'unknown'} | Object:{' '}
                          {fact.object_display || fact.object_key || 'n/a'}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Time: {formatTemporal(fact.temporal_start, fact.temporal_granularity)}
                        </div>
                        {fact.superseded_by_fact_id && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Replaced by: {fact.superseded_by_fact_id} at {fact.superseded_at || 'unknown'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No canonical facts were linked to this message.
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="text-sm font-semibold">Replacements</div>
                {replacements.length > 0 ? (
                  <div className="space-y-3">
                    {replacements.map((replacement, index) => (
                      <div
                        key={`${replacement.claim_id || 'replacement'}-${replacement.replacement_fact_id || index}`}
                        className="rounded-lg border p-4"
                      >
                        <div className="text-sm font-medium">
                          {(replacement.previous_display_summary || replacement.previous_summary || replacement.previous_fact_id || 'Previous fact')}{' '}
                          {' -> '}
                          {(replacement.replacement_display_summary ||
                            replacement.replacement_summary ||
                            replacement.replacement_fact_id ||
                            'Replacement fact')}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Canonical key: {replacement.canonical_key || 'unknown'} | Superseded at:{' '}
                          {replacement.superseded_at || 'unknown'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    SAIA has not recorded a replacement for this message.
                  </div>
                )}
              </section>

              {runs.length > 0 && (
                <section className="space-y-3">
                  <div className="text-sm font-semibold">SAIA runs</div>
                  <div className="space-y-3">
                    {runs.map((run) => (
                      <div key={run.run_id || run.source_doc_id || 'run'} className="rounded-lg border p-4">
                        <div className="text-sm font-medium">{run.run_id || 'Run'}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Source doc: {run.source_doc_id || 'unknown'} | Status: {formatLabel(run.status)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Claims: {run.claims_extracted ?? 0} | Canonicalized: {run.claims_canonicalized ?? 0} |
                          Conflicts: {run.conflicts_found ?? 0}
                        </div>
                        {run.errors?.reason && (
                          <div className="mt-1 text-xs text-red-500">{run.errors.reason}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(isAnswerMessage || trace) && (
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
                      This answer does not have saved retrieval provenance data.
                    </div>
                  )}
                </section>
              )}

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

              {(isAnswerMessage || trace) && (
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

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {rankLabel} retrieval path (Neo4j)
                  </div>

                  <Tabs value={selectedRank} onValueChange={(value) => setSelectedRank(value as '1' | '2' | '3')}>
                    <TabsList className="h-9">
                      <TabsTrigger value="1" className="text-xs" disabled={!hasTop1}>
                        Top-1
                      </TabsTrigger>
                      <TabsTrigger value="2" className="text-xs" disabled={!hasTop2}>
                        Top-2
                      </TabsTrigger>
                      <TabsTrigger value="3" className="text-xs" disabled={!hasTop3}>
                        Top-3
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {isLoadingTopGraph && (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Loading {rankLabel} subgraph...
                    </div>
                  )}
                  {topGraphError && (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-red-500">
                      {topGraphError}
                    </div>
                  )}

                  {isLoadingTopPath && (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Loading {rankLabel} hop path...
                    </div>
                  )}
                  {topPathError && (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-red-500">
                      {topPathError}
                    </div>
                  )}

                  {topPath && (
                    <div className="text-xs text-muted-foreground">
                      Hop count: <span className="font-medium text-foreground">{topPath.hop_count}</span>
                    </div>
                  )}

                  {topGraph ? (
                    <GraphGlobalSnapshotFlow trace={null} graph={topGraph} path={topPath} />
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No Neo4j subgraph available for the {rankLabel} result.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
