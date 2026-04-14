'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Menu } from 'lucide-react'

import ChatWindow from '@/app/components/ChatWindow'
import { useAuth } from '@/context/AuthContext'
import { useMediaQuery } from '@/hooks/use-mobile'
import { addConnectionListener, addMessageListener, connectWebSocket, manualReconnect } from '@/lib/websocket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ConversationSummary, Message } from '@/types'

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

export default function ChatPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const isMobile = useMediaQuery('(max-width: 768px)')

  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  const selectedConversationIdRef = useRef(selectedConversationId)

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId
  }, [selectedConversationId])

  const loadConversations = async (preferredConversationId?: string) => {
    setIsLoadingConversations(true)
    setPageError(null)

    try {
      const response = await fetch('/api/conversations', { cache: 'no-store' })
      const payload = await parseJsonSafe<{ conversations?: ConversationSummary[]; detail?: string }>(response)
      if (!response.ok) {
        throw new Error(payload?.detail || 'Failed to load conversations')
      }

      const nextConversations = payload?.conversations || []
      setConversations(nextConversations)

      if (!nextConversations.length) {
        setSelectedConversationId('')
        setMessages([])
        return
      }

      const desiredId =
        preferredConversationId && nextConversations.some((item) => item.id === preferredConversationId)
          ? preferredConversationId
          : selectedConversationIdRef.current && nextConversations.some((item) => item.id === selectedConversationIdRef.current)
            ? selectedConversationIdRef.current
            : nextConversations.find((item) => item.type === 'sage')?.id || nextConversations[0]?.id || ''

      setSelectedConversationId(desiredId)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load conversations')
    } finally {
      setIsLoadingConversations(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    if (!conversationId) {
      setMessages([])
      return
    }

    setIsLoadingMessages(true)
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, { cache: 'no-store' })
      const payload = await parseJsonSafe<{ messages?: Message[]; detail?: string }>(response)
      if (!response.ok) {
        throw new Error(payload?.detail || 'Failed to load messages')
      }
      setMessages(payload?.messages || [])
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load messages')
    } finally {
      setIsLoadingMessages(false)
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, router, user])

  useEffect(() => {
    if (!user) {
      return
    }

    loadConversations()
  }, [user])

  useEffect(() => {
    if (!user || !selectedConversationId) {
      return
    }
    loadMessages(selectedConversationId)
  }, [selectedConversationId, user])

  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      return
    }

    connectWebSocket()

    const removeConnectionListener = addConnectionListener((connected) => {
      setIsConnected(connected)
    })

    const removeMessageListener = addMessageListener((event) => {
      const activeConversationId = selectedConversationIdRef.current
      const shouldRefreshMessages = !event?.conversationId || event.conversationId === activeConversationId
      void loadConversations(activeConversationId)
      if (shouldRefreshMessages && activeConversationId) {
        void loadMessages(activeConversationId)
      }
    })

    return () => {
      removeConnectionListener()
      removeMessageListener()
    }
  }, [user])

  if (loading || !user) {
    return null
  }

  const selectedConversation = conversations.find((item) => item.id === selectedConversationId) || null

  const filteredConversations = conversations.filter((conversation) => {
    if (!contactSearch.trim()) {
      return true
    }

    const query = contactSearch.toLowerCase()
    return (
      conversation.title.toLowerCase().includes(query) ||
      conversation.id.toLowerCase().includes(query) ||
      (conversation.otherUser?.email || '').toLowerCase().includes(query)
    )
  })

  const userList = (
    <div className="w-full h-full min-h-0 overflow-y-auto scrollbar-hidden bg-white dark:bg-gray-900">
      <div className="p-4 space-y-3">
        <div className="font-semibold dark:text-white">Conversations</div>
        <Input
          value={contactSearch}
          onChange={(event) => setContactSearch(event.target.value)}
          placeholder="Search chats..."
          className="h-9"
        />
      </div>
      <Separator className="dark:bg-gray-700" />
      <div className="space-y-1">
        {filteredConversations.map((conversation) => {
          const preview = conversation.lastMessage?.attachmentName || conversation.lastMessage?.content || ''
          const isSelected = selectedConversationId === conversation.id
          const badgeLabel =
            conversation.type === 'group'
              ? 'Group'
              : conversation.type === 'sage'
                ? 'SAGE'
                : 'Direct'

          return (
            <div
              key={conversation.id}
              className={`p-3 rounded flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                isSelected ? 'bg-gray-50 dark:bg-gray-800' : ''
              }`}
              onClick={() => {
                setSelectedConversationId(conversation.id)
                if (isMobile) {
                  const button = document.querySelector('.mobile-menu-close')
                  if (button instanceof HTMLButtonElement) {
                    button.click()
                  }
                }
              }}
            >
              <div className="text-2xl relative">
                {conversation.avatar || conversation.title.charAt(0).toUpperCase()}
                {conversation.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-blue-600 rounded-full border-2 border-white dark:border-gray-900 text-[10px] leading-none flex items-center justify-center text-white">
                    {conversation.unreadCount}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline gap-2">
                  <span className={`font-medium truncate ${conversation.unreadCount > 0 ? 'font-semibold' : ''} dark:text-white`}>
                    {conversation.title}
                  </span>
                  {conversation.lastMessage?.sentAt && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                      {format(new Date(conversation.lastMessage.sentAt), 'MMM d, h:mm a')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {badgeLabel}
                  </span>
                  {preview && (
                    <p
                      className={`text-sm truncate ${
                        conversation.unreadCount > 0
                          ? 'text-gray-900 font-medium dark:text-gray-200'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {preview}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {!filteredConversations.length && !isLoadingConversations && (
          <div className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400">
            No conversations matched your search.
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-full min-h-0 chat-page-container">
      {isMobile ? (
        <div className="fixed top-0 left-0 z-10 p-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[250px] sm:w-[320px] p-0 overflow-hidden">
              {userList}
              <button className="hidden mobile-menu-close">close</button>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="w-[320px] border-r h-full min-h-0 overflow-hidden bg-white dark:border-gray-700">
          {userList}
        </div>
      )}

      <div className={`${isMobile ? 'w-full' : 'flex-1'} h-full min-h-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900`}>

        {pageError && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {pageError}
          </div>
        )}

        {selectedConversation ? (
          <ChatWindow
            currentUserId={user.id}
            currentUser={user}
            conversation={selectedConversation}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            isConnected={isConnected}
            onReconnect={manualReconnect}
            onRefreshMessages={() => loadMessages(selectedConversation.id)}
            onRefreshConversations={() => loadConversations(selectedConversation.id)}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            {isLoadingConversations ? 'Loading conversations...' : 'Select a conversation to start chatting'}
          </div>
        )}
      </div>
    </div>
  )
}
