export type ConversationType = 'direct' | 'group' | 'sage'
export type GraphSyncStatus = 'ready' | 'failed' | 'skipped' | 'pending'

export interface FileAttachment {
  id: string
  name: string
  type: string
  size: number
  url: string
}

export interface ChatTraceEvidence {
  chunk_id?: string
  chunk_summary?: string
  similarity?: number
  rank_score?: number
  relationship?: string
  direction?: string
  retrieval_path?: string
  hop_count?: number
  document?: {
    doc_id?: string
    subject?: string
    sender?: string
    timestamp?: string
    source?: string
  }
  related_node?: {
    label?: string
    display_name?: string
    id?: string
  }
  related_node_id?: string
  fact?: {
    claim_type?: string
    status?: string
    canonical_key?: string
    subject_key?: string
    subject_entity_id?: string
    object_key?: string
    object_entity_id?: string
    temporal_start?: string
    temporal_end?: string
    temporal_granularity?: string
    support_count?: number
    confidence?: number
  } | null
}

export interface AgenticToolCall {
  tool?: string
  attempt?: number
  query?: string
  status?: string
  result_count?: number
  duration_ms?: number
  error?: string | null
}

export interface AgenticRound {
  attempt?: number
  tool?: string
  result_count?: number
  evidence_ref_count?: number
  validated_evidence_count?: number
  enough_context?: boolean
}

export interface AgentEvent {
  event_id?: string
  run_id?: string
  timestamp?: string
  event_type?: string
  agent?: string
  stage?: string
  status?: string
  message?: string
  tool?: string
  attempt?: number
  duration_ms?: number
  result_count?: number
  error?: string | null
}

export interface AgenticPlanner {
  planner?: string
  intent?: string
  entities?: string[]
  extracted_constraints?: Record<string, unknown>
  required_evidence?: string[]
  risk_flags?: string[]
  strategy?: string
  agents?: string[]
  tool_sequence?: string[]
  tool_plan?: Array<{ tool?: string; purpose?: string }>
  stop_conditions?: string[]
  selector?: {
    strategy?: string
    reasons?: string[]
    llm_used?: boolean
    heuristic_confidence?: number
  }
  constraints?: {
    allowed_nodes?: string[]
    allowed_edges?: string[]
    max_depth?: number
    max_rounds?: number
    max_retries?: number
  }
}

export interface AgenticTrace {
  enabled?: boolean
  run_id?: string
  planner?: AgenticPlanner
  rounds?: AgenticRound[]
  tool_calls?: AgenticToolCall[]
  events?: AgentEvent[]
  route_history?: AgentEvent[]
  current_agent?: string | null
  stop_reason?: string
  reasoner?: {
    valid?: boolean
    validated_evidence_count?: number
    invalid_refs?: string[]
    missing_fields?: Array<{ evidence_index?: number; missing?: string[] }>
  }
  generator?: {
    answer_mode?: string
    reason_code?: string
  }
  critic?: {
    passed?: boolean
    retryable?: boolean
    issues?: string[]
    grounded_evidence_count?: number
    provenance_count?: number
  }
  status?: string
}

export interface ChatTrace {
  query?: string
  query_type?: string
  user_scoped?: boolean
  user_id?: string | null
  matched_entities?: string[]
  result_count?: number
  max_hop_count?: number
  retrieval_path?: string
  evidence?: ChatTraceEvidence[]
  no_evidence?: boolean
  evidence_state?: 'no_evidence' | 'partial_evidence' | 'grounded'
  error?: string
  agentic?: AgenticTrace
}

export interface AnswerPayload {
  schema_version: 1
  mode: 'short' | 'long'
  reason_code:
    | 'explicit_short'
    | 'explicit_long'
    | 'direct_lookup'
    | 'broad_or_explanatory'
    | 'evidence_complexity'
    | 'fallback_invalid_json'
  summary: string
  bullets: string[]
  explanation: string
  evidence_refs: string[]
}

export interface SAIAFactLink {
  relation_type?: string
  fact_id?: string
  canonical_key?: string
  summary?: string
  status?: string
  support_count?: number
  superseded_by_fact_id?: string
  superseded_at?: string
  subject_display?: string
  object_display?: string
}

export interface SAIAGroundingReference {
  role?: string
  raw?: string
  resolved_key?: string
  entity_id?: string
  entity_type?: string
  status?: string
  display_name?: string
}

export interface SAIAGrounding {
  source_kind?: string
  conversation_type?: string
  scope_type?: string
  scope_id?: string
  anchor_sent_at?: string
  sender_id?: string
  receiver_ids?: string[]
  group_id?: string | null
  references?: SAIAGroundingReference[]
  temporal_expressions?: string[]
  temporal_start?: string
  temporal_end?: string
  temporal_granularity?: string
  timezone?: string
}

export interface SAIAClaim {
  claim_id?: string
  source_doc_id?: string
  claim_type?: string
  predicate?: string
  subject_raw?: string
  subject_key?: string
  object_raw?: string
  object_key?: string
  value_text?: string
  normalized_text?: string
  source_span_text?: string
  resolution_status?: string
  promotion_status?: string
  mutation_action?: string
  extraction_confidence?: number
  canonical_confidence?: number
  temporal_start?: string
  temporal_end?: string
  temporal_granularity?: string
  timezone?: string
  preview_only?: boolean
  grounding?: SAIAGrounding
  subject_display?: string
  object_display?: string
  display_text?: string
  facts?: SAIAFactLink[]
}

export interface SAIACanonicalFact {
  fact_id?: string
  canonical_key?: string
  claim_type?: string
  predicate?: string
  subject_key?: string
  object_key?: string
  value_text?: string
  summary?: string
  status?: string
  confidence?: number
  support_count?: number
  temporal_start?: string
  temporal_end?: string
  temporal_granularity?: string
  timezone?: string
  first_seen_at?: string
  last_seen_at?: string
  superseded_by_fact_id?: string
  superseded_at?: string
  subject_display?: string
  object_display?: string
  display_summary?: string
}

export interface SAIASourceDocument {
  doc_id?: string
  source?: string
  subject?: string
  timestamp?: string
  attachment_name?: string
  origin_message_id?: string
  linked_message_id?: string
  saia_status?: string
  saia_processed_at?: string
  saia_error?: string
}

export interface SAIARun {
  id?: string
  run_id?: string
  source_doc_id?: string
  source_kind?: string
  status?: string
  reason?: string
  processed_at?: string
  claims_extracted?: number
  claims_canonicalized?: number
  conflicts_found?: number
  changed_fact_ids?: string[]
  affected_node_ids?: string[]
  invalidated_query_ids?: string[]
  reembed_target_ids?: string[]
  diff_summary?: {
    changed_fact_count?: number
    mutation_counts?: Record<string, number>
  }
  impact_summary?: {
    affected_node_count?: number
    changed_fact_count?: number
    reembed_target_count?: number
  }
  invalidation_summary?: {
    invalidated_query_count?: number
  }
  errors?: {
    reason?: string
    raw?: string
  }
}

export interface SAIAReplacement {
  claim_id?: string
  previous_fact_id?: string
  previous_summary?: string
  previous_status?: string
  replacement_fact_id?: string
  replacement_summary?: string
  canonical_key?: string
  superseded_at?: string
  previous_display_summary?: string
  replacement_display_summary?: string
}

export interface MessageSAIAInsight {
  message_id: string
  message_source?: string
  saia_status?: string
  saia_processed_at?: string
  saia_error?: string
  warnings?: string[]
  diff_summary?: {
    changed_fact_count?: number
    mutation_counts?: Record<string, number>
  }
  impact_summary?: {
    affected_node_count?: number
    changed_fact_count?: number
    reembed_target_count?: number
  }
  invalidation_summary?: {
    invalidated_query_count?: number
  }
  reembed_target_ids?: string[]
  source_documents?: SAIASourceDocument[]
  runs?: SAIARun[]
  claims?: SAIAClaim[]
  preview_claims?: SAIAClaim[]
  canonical_facts?: SAIACanonicalFact[]
  replacements?: SAIAReplacement[]
  summary?: {
    document_count?: number
    run_count?: number
    claim_count?: number
    preview_claim_count?: number
    canonical_fact_count?: number
    replacement_count?: number
  }
}

export interface Message {
  id: string
  conversationId: string
  conversationType: ConversationType
  senderId: string
  receiverId?: string | null
  groupId?: string | null
  content: string
  sentAt: string
  readByCurrentUser?: boolean
  source?: string
  graphSyncStatus?: GraphSyncStatus
  thinking?: string[]
  answerPayload?: AnswerPayload | null
  isAiResponse?: boolean
  role?: 'user' | 'assistant'
  attachment?: FileAttachment | null
  trace?: ChatTrace | null
  syncToGraph?: boolean
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  team?: string[]
  isPinned?: boolean
  isBot?: boolean
}

export interface AuthSession {
  user: User | null
}

export interface Group {
  id: string
  name: string
  description?: string
  avatar?: string
  memberIds: string[]
}

export interface ConversationSummary {
  id: string
  type: ConversationType
  title: string
  avatar?: string | null
  unreadCount: number
  groupId?: string | null
  participants?: User[]
  participantIds: string[]
  otherUser?: User | null
  lastMessage?: {
    id: string
    content: string
    sentAt: string
    senderId: string
    attachmentName?: string | null
    graphSyncStatus?: GraphSyncStatus | null
  } | null
}
