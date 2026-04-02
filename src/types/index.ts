export type ConversationType = 'direct' | 'group' | 'sage'
export type GraphSyncStatus = 'ready' | 'failed' | 'skipped'

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
  relationship?: string
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
  error?: string
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
