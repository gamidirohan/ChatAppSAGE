// Shared types for the application

export interface FileAttachment {
  id: string;
  name: string;
  type: string; // MIME type
  size: number;
  url: string;
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
