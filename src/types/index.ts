// Shared types for the application

export interface FileAttachment {
  id: string;
  name: string;
  type: string; // MIME type
  size: number;
  url: string;
}

export interface ChatTraceEvidence {
  chunk_id?: string;
  chunk_summary?: string;
  similarity?: number;
  relationship?: string;
  retrieval_path?: string;
  hop_count?: number;
  document?: {
    doc_id?: string;
    subject?: string;
    sender?: string;
    timestamp?: string;
    source?: string;
  };
  related_node?: {
    label?: string;
    display_name?: string;
    id?: string;
  };
}

export interface ChatTrace {
  query?: string;
  query_type?: string;
  user_scoped?: boolean;
  user_id?: string | null;
  matched_entities?: string[];
  result_count?: number;
  max_hop_count?: number;
  retrieval_path?: string;
  evidence?: ChatTraceEvidence[];
  error?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string; // ISO string format
  read?: boolean;
  thinking?: string[];
  isAiResponse?: boolean;
  role?: 'user' | 'assistant'; // For ChatInterface component
  attachment?: FileAttachment; // Optional file attachment
  trace?: ChatTrace;
  skipGraphSync?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  password?: string; // Only used server-side
  team?: string[];
  isPinned?: boolean;
  isBot?: boolean;
}

export interface UserWithLastMessage extends User {
  lastMessage?: {
    content: string;
    timestamp: string;
    isUnread?: boolean;
  };
}
