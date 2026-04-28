'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Check, CircuitBoard, Copy, FileText, Info, Paperclip, Send, Users, X } from 'lucide-react'

import AgentExecutionRail from '@/app/components/AgentExecutionRail'
import MessageTraceSheet from '@/app/components/MessageTraceSheet'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AgentEvent, ConversationSummary, FileAttachment, Message, User } from '@/types'

type Props = {
  currentUserId: string
  currentUser: User
  conversation: ConversationSummary
  messages: Message[]
  isLoadingMessages: boolean
  isConnected: boolean
  onReconnect: () => void
  onRefreshMessages: () => Promise<void>
  onRefreshConversations: () => Promise<void>
}

type CreateMessageResponse = {
  message: Message
  notifyUserIds: string[]
}

type GroupMember = {
  id: string
  name: string
  avatar?: string
  isCurrentUser: boolean
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

type SageChatPayload = {
  answer?: string
  answer_payload?: Message['answerPayload']
  thinking?: string[]
  trace?: Message['trace']
  detail?: string
}

function parseSseBlock(block: string) {
  let event = 'message'
  const dataLines: string[] = []
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trimEnd()
    if (!line || line.startsWith(':')) {
      continue
    }
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }
  if (!dataLines.length) {
    return null
  }
  return { event, data: dataLines.join('\n') }
}

async function readSageChatStream(
  response: Response,
  onAgentEvent: (event: AgentEvent) => void
): Promise<SageChatPayload> {
  if (!response.body) {
    throw new Error('SAGE did not return a readable stream')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalPayload: SageChatPayload | null = null

  const handleBlock = (block: string) => {
    const parsed = parseSseBlock(block)
    if (!parsed) {
      return
    }
    const payload = JSON.parse(parsed.data)
    if (parsed.event === 'progress') {
      // Suppress compatibility fallback notifications so users see a clean rail.
      if (payload?.event_type === 'stream_fallback') return
      onAgentEvent(payload as AgentEvent)
      // progress events do not carry thinking today; ignore
    } else if (parsed.event === 'final') {
      finalPayload = payload as SageChatPayload
    } else if (parsed.event === 'error') {
      throw new Error(String(payload?.detail || 'SAGE stream failed'))
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() || ''
    for (const block of blocks) {
      handleBlock(block)
    }
  }

  buffer += decoder.decode()
  if (buffer.trim()) {
    handleBlock(buffer)
  }
  if (!finalPayload) {
    throw new Error('SAGE stream ended before returning an answer')
  }
  return finalPayload
}

function formatMessageForCopy(message: Message) {
  const sections: string[] = []
  const payload = message.answerPayload

  sections.push(payload?.summary || message.content)

  if (payload?.bullets?.length) {
    sections.push(`Bullets:\n${payload.bullets.map((bullet) => `- ${bullet}`).join('\n')}`)
  }
  if (payload?.explanation) {
    sections.push(`Explanation:\n${payload.explanation}`)
  }
  if (payload?.evidence_refs?.length) {
    sections.push(`Evidence refs:\n${payload.evidence_refs.map((ref) => `- ${ref}`).join('\n')}`)
  }
  if (message.attachment) {
    sections.push(`Attachment:\n${message.attachment.name} (${message.attachment.type || 'unknown type'})`)
  }
  if (message.thinking?.length) {
    sections.push(`Thinking summary:\n${message.thinking.map((item) => `- ${item}`).join('\n')}`)
  }

  const agentic = message.trace?.agentic
  if (agentic) {
    const toolCalls = agentic.tool_calls?.map((toolCall) => {
      const pieces = [
        toolCall.tool || 'unknown',
        toolCall.status ? `status=${toolCall.status}` : null,
        typeof toolCall.result_count === 'number' ? `results=${toolCall.result_count}` : null,
      ].filter(Boolean)
      return `- ${pieces.join(' | ')}`
    })
    sections.push(
      [
        'Agent flow:',
        `Status: ${agentic.status || 'unknown'}`,
        `Planner: ${agentic.planner?.intent || agentic.planner?.strategy || agentic.planner?.planner || 'unknown'}`,
        `Stop reason: ${agentic.stop_reason || 'unknown'}`,
        toolCalls?.length ? `Tool calls:\n${toolCalls.join('\n')}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  return sections.filter((section) => section.trim()).join('\n\n')
}

function agentEvent(
  message: Message,
  agent: string,
  stage: string,
  status: string,
  text: string,
  tool?: string,
  index = 0
): AgentEvent {
  return {
    event_id: `message-${message.id}-${agent}-${stage}-${tool || 'agent'}-${index}`,
    run_id: message.trace?.agentic?.run_id || message.id,
    timestamp: message.sentAt,
    event_type: status === 'running' ? 'agent_started' : 'agent_finished',
    agent,
    stage,
    status,
    message: text,
    tool,
  }
}

const RAIL_AGENT_KEYS = new Set([
  'planner',
  'retriever',
  'semantic',
  'fulltext',
  'graph',
  'reasoner',
  'generator',
  'critic',
])

function countRailStageCoverage(events: AgentEvent[]) {
  const covered = new Set<string>()
  events.forEach((event) => {
    const agent = event.agent?.toLowerCase()
    const tool = event.tool?.toLowerCase()
    if (agent && RAIL_AGENT_KEYS.has(agent)) {
      covered.add(agent)
    }
    if (tool && RAIL_AGENT_KEYS.has(tool)) {
      covered.add(tool)
    }
  })
  return covered.size
}

function buildFallbackPipelineEvents(message: Message): AgentEvent[] {
  const trace = message.trace
  const answerPayload = message.answerPayload
  const evidence = trace?.evidence || []
  const evidenceCount = evidence.length
  const resultCount = typeof trace?.result_count === 'number' ? trace.result_count : evidenceCount
  const evidenceRefCount = answerPayload?.evidence_refs?.length ?? 0
  const evidenceState =
    trace?.evidence_state || (trace?.no_evidence ? 'no_evidence' : evidenceCount > 0 ? 'grounded' : 'partial_evidence')
  const hasRetrievalTrace = Boolean(
    trace?.query ||
      trace?.retrieval_path ||
      trace?.matched_entities?.length ||
      evidenceCount ||
      typeof trace?.result_count === 'number'
  )
  const hasGraphBinding = evidence.some(
    (item) => item.relationship || item.direction || item.related_node_id || item.retrieval_path
  )
  const hasCriticSummary = (message.thinking || []).some((item) => /critic/i.test(item))
  const events: AgentEvent[] = [
    agentEvent(message, 'planner', 'plan', 'completed', 'Planner prepared the reply path.'),
  ]

  if (hasRetrievalTrace) {
    events.push(
      agentEvent(
        message,
        'retriever',
        'retrieve',
        'completed',
        `Retriever gathered ${resultCount} candidate evidence item(s).`
      )
    )
  }

  if (hasGraphBinding) {
    events.push(
      agentEvent(
        message,
        'graph',
        'validate_paths',
        'completed',
        'Graph bindings were available for this reply.'
      )
    )
  }

  if (hasRetrievalTrace || trace || answerPayload) {
    const reasonerMessage =
      evidenceState === 'no_evidence'
        ? 'Reasoner completed with no grounded evidence available.'
        : `Reasoner completed with ${evidenceRefCount || evidenceCount} bound evidence reference(s).`
    events.push(agentEvent(message, 'reasoner', 'validate_paths', 'completed', reasonerMessage))
  }

  events.push(agentEvent(message, 'generator', 'generate', 'completed', 'Generator produced the answer.'))

  if (hasCriticSummary) {
    events.push(agentEvent(message, 'critic', 'critic', 'completed', 'Critic completed final checks.'))
  }

  return events
}

function buildMessageAgentRailEvents(message: Message): AgentEvent[] {
  const storedEvents = message.trace?.agentic?.events ?? []
  if (countRailStageCoverage(storedEvents) >= 2) {
    return storedEvents
  }

  const agentic = message.trace?.agentic
  if (!agentic) {
    return buildFallbackPipelineEvents(message)
  }

  const events: AgentEvent[] = [
    agentEvent(message, 'planner', 'plan', 'completed', 'Planner prepared an answer strategy.'),
  ]

  const toolCalls = agentic.tool_calls ?? []
  toolCalls.forEach((toolCall, index) => {
    const tool = toolCall.tool || 'retriever'
    events.push(
      agentEvent(
        message,
        'retriever',
        'retrieve',
        'completed',
        `Retriever used ${tool}.`,
        tool,
        index
      )
    )
    events.push({
      ...agentEvent(
        message,
        tool,
        'retrieve',
        toolCall.status === 'failed' ? 'failed' : 'completed',
        `${tool} returned ${toolCall.result_count ?? 0} result(s).`,
        tool,
        index
      ),
      result_count: toolCall.result_count,
      duration_ms: toolCall.duration_ms,
      error: toolCall.error,
    })
  })

  if (agentic.reasoner) {
    events.push(
      agentEvent(
        message,
        'reasoner',
        'validate_paths',
        'completed',
        `Reasoner validated ${agentic.reasoner.validated_evidence_count ?? 0} evidence binding(s).`
      )
    )
  }

  events.push(agentEvent(message, 'generator', 'generate', 'completed', 'Generator produced the answer.'))

  if (agentic.critic) {
    events.push(
      agentEvent(
        message,
        'critic',
        'critic',
        agentic.critic.passed === false ? 'needs_review' : 'completed',
        agentic.critic.passed === false ? 'Critic found review items.' : 'Critic completed grounding checks.'
      )
    )
  }

  return countRailStageCoverage(events) >= 2 ? events : buildFallbackPipelineEvents(message)
}

export default function ChatWindow({
  currentUserId,
  currentUser,
  conversation,
  messages,
  isLoadingMessages,
  isConnected,
  onReconnect,
  onRefreshMessages,
  onRefreshConversations,
}: Props) {
  const [newMessage, setNewMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [processingAttachmentName, setProcessingAttachmentName] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [traceMessage, setTraceMessage] = useState<Message | null>(null)
  const [isTraceOpen, setIsTraceOpen] = useState(false)
  const [forceAdvancedTrace, setForceAdvancedTrace] = useState(false)
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null)
  const [isThinkingOpen, setIsThinkingOpen] = useState(false)
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([])
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [openRetrievalMessageId, setOpenRetrievalMessageId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const markedReadForConversationRef = useRef<string>('')
  const copyResetTimeoutRef = useRef<number | null>(null)
  const isSageConversation = conversation.type === 'sage'

  useEffect(() => {
    markedReadForConversationRef.current = ''
    setOpenRetrievalMessageId(null)
  }, [conversation.id])

  useEffect(() => {
    const unreadMessages = messages.filter((message) => message.senderId !== currentUserId && !message.readByCurrentUser)
    if (!unreadMessages.length) {
      return
    }

    const currentRunKey = `${conversation.id}:${unreadMessages.map((message) => message.id).join(',')}`
    if (markedReadForConversationRef.current === currentRunKey) {
      return
    }
    markedReadForConversationRef.current = currentRunKey

    let cancelled = false

    const markAsRead = async () => {
      try {
        await Promise.all(
          unreadMessages.map((message) =>
            fetch(`/api/messages/${message.id}/read`, {
              method: 'POST',
            })
          )
        )
        if (!cancelled) {
          await onRefreshMessages()
          await onRefreshConversations()
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to mark messages as read:', error)
        }
      }
    }

    void markAsRead()

    return () => {
      cancelled = true
    }
  }, [conversation.id, currentUserId, messages, onRefreshConversations, onRefreshMessages])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 80)
    return () => window.clearTimeout(timeoutId)
  }, [messages, processingAttachmentName, agentEvents.length])

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current)
      }
    }
  }, [])

  const clearSelectedFile = () => {
    setSelectedFile(null)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
    setUploadError(null)
  }

  const uploadFile = async (file: File): Promise<FileAttachment> => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const payload = await parseJsonSafe<{ error?: string; file?: FileAttachment }>(response)
      if (!response.ok || !payload?.file) {
        throw new Error(payload?.error || 'Failed to upload file')
      }
      return payload.file
    } finally {
      setIsUploading(false)
    }
  }

  const createConversationMessage = async (payload: Partial<Message>) => {
    const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await parseJsonSafe<CreateMessageResponse & { detail?: string }>(response)
    if (!response.ok || !body?.message) {
      throw new Error(body?.detail || 'Failed to save message')
    }
    return body.message
  }

  const processAttachmentDocument = async (file: File, attachment: FileAttachment, message: Message) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('conversation_id', conversation.id)
    formData.append('conversation_type', conversation.type)
    formData.append('sent_at', message.sentAt)
    formData.append('linked_message_id', message.id)
    formData.append('attachment_name', attachment.name)
    formData.append('attachment_type', attachment.type)
    formData.append('attachment_url', attachment.url)
    formData.append('source', 'message_attachment')

    if (conversation.type === 'group' && conversation.groupId) {
      formData.append('group_id', conversation.groupId)
      formData.append('receiver_ids_json', JSON.stringify(conversation.participantIds))
    } else if (conversation.type === 'direct' || conversation.type === 'sage') {
      if (conversation.otherUser?.id) {
        formData.append('receiver_id', conversation.otherUser.id)
      }
    }

    const response = await fetch('/api/process-document', {
      method: 'POST',
      body: formData,
    })
    const payload = await parseJsonSafe<{ detail?: string; error?: string }>(response)
    if (!response.ok) {
      throw new Error(payload?.detail || payload?.error || 'Failed to process attachment')
    }
  }

  const refreshConversationState = async () => {
    await onRefreshMessages()
    await onRefreshConversations()
  }

  const sendSageReply = async (payload: {
    content?: string
    answerPayload?: Message['answerPayload']
    trace?: Message['trace']
    thinking?: string[]
    syncToGraph?: boolean
  }) => {
    const content = payload.answerPayload?.summary || payload.content || ''
    await createConversationMessage({
      senderId: 'sage',
      receiverId: currentUserId,
      content,
      sentAt: new Date().toISOString(),
      source: 'sage_response',
      trace: payload.trace,
      thinking: payload.thinking || [],
      answerPayload: payload.answerPayload,
      role: 'assistant',
      isAiResponse: true,
      syncToGraph: payload.syncToGraph ?? false,
    })
  }

  const handleSendMessage = async () => {
    const plainTextMessage = newMessage.trim()
    const fileToSend = selectedFile

    if (!plainTextMessage && !fileToSend) {
      return
    }

    setUploadError(null)
    setIsSending(true)

    try {
      let attachment: FileAttachment | null = null
      if (fileToSend) {
        attachment = await uploadFile(fileToSend)
      }

      const attachmentOnlyMessage = Boolean(fileToSend) && !plainTextMessage
      const content = plainTextMessage || (attachment ? `Sent a file: ${attachment.name}` : '')

      const persistedUserMessage = await createConversationMessage({
        senderId: currentUserId,
        receiverId: conversation.type === 'group' ? undefined : conversation.otherUser?.id,
        groupId: conversation.groupId || undefined,
        content,
        sentAt: new Date().toISOString(),
        source: attachment ? 'chat_attachment' : 'chat_message',
        attachment,
        role: 'user',
        isAiResponse: false,
        syncToGraph: !isSageConversation && !attachmentOnlyMessage,
      })

      setNewMessage('')
      clearSelectedFile()
      await refreshConversationState()

      if (fileToSend && attachment) {
        setProcessingAttachmentName(attachment.name)
        try {
          await processAttachmentDocument(fileToSend, attachment, persistedUserMessage)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to process attachment'
          setUploadError(message)

          if (isSageConversation && attachmentOnlyMessage) {
            await sendSageReply({
              content: `I saved "${attachment.name}", but I couldn't process its contents yet. ${message}`,
              syncToGraph: false,
            })
            await refreshConversationState()
            return
          }
        } finally {
          setProcessingAttachmentName(null)
        }
      }

      if (!isSageConversation) {
        return
      }

      if (attachmentOnlyMessage && attachment) {
        await sendSageReply({
          content: `I've finished processing "${attachment.name}" and added it to the knowledge base. You can ask me what you want to know about it now.`,
          syncToGraph: false,
        })
        await refreshConversationState()
        return
      }

      const history = messages.slice(-10).map((message) => ({
        role: message.senderId === currentUserId ? 'user' : 'assistant',
        content: message.content,
      }))

      const localStartEvent: AgentEvent = {
        event_id: `local-${Date.now()}`,
        run_id: 'pending',
        timestamp: new Date().toISOString(),
        event_type: 'agent_started',
        agent: 'planner',
        stage: 'plan',
        status: 'running',
        message: 'Planner is preparing the agent pipeline.',
      }
      setAgentEvents([localStartEvent])

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: plainTextMessage,
          history,
        }),
      })
      if (!response.ok) {
        const errorPayload = await parseJsonSafe<{ detail?: string }>(response)
        throw new Error(errorPayload?.detail || 'Failed to get SAGE response')
      }
      const payload = await readSageChatStream(response, (event) => {
        setAgentEvents((currentEvents) => [...currentEvents, event])
      })
      const answerSummary = payload?.answer_payload?.summary || payload?.answer
      if (!response.ok || !answerSummary || !payload?.answer_payload) {
        throw new Error(payload?.detail || 'Failed to get SAGE response')
      }

      await sendSageReply({
        content: answerSummary,
        answerPayload: payload.answer_payload,
        trace: payload.trace,
        thinking: payload.thinking || [],
      })
      await refreshConversationState()
      setAgentEvents([])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message'
      setUploadError(message)

      if (isSageConversation) {
        try {
          await sendSageReply({
            content: `Sorry, I ran into an error while processing that request. ${message}`,
            syncToGraph: false,
          })
          await refreshConversationState()
        } catch (nestedError) {
          console.error('Failed to persist SAGE error message:', nestedError)
        }
      }
    } finally {
      setIsSending(false)
      setAgentEvents([])
      setProcessingAttachmentName(null)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSendMessage()
    }
  }

  const formatMessageTime = (sentAt: string) => format(new Date(sentAt), 'h:mm a')

  const handleCopyMessage = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(formatMessageForCopy(message))
      setCopiedMessageId(message.id)
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current)
      }
      copyResetTimeoutRef.current = window.setTimeout(() => setCopiedMessageId(null), 1500)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to copy message')
    }
  }

  const participantDetails: Array<{ id: string; name: string; avatar?: string }> =
    conversation.participants && conversation.participants.length > 0
      ? conversation.participants.map((member) => ({
          id: member.id,
          name: member.name,
          avatar: member.avatar,
        }))
      : conversation.participantIds.map((id) => ({ id, name: `User ${id}` }))
  const groupMembers: GroupMember[] =
    conversation.type === 'group'
      ? [
          { id: currentUserId, name: currentUser.name, avatar: currentUser.avatar, isCurrentUser: true },
          ...participantDetails
            .filter((member) => member.id !== currentUserId)
            .map((member) => ({ ...member, isCurrentUser: false })),
        ]
      : []

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-2 border-b flex-shrink-0 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium dark:text-white">{conversation.title}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {conversation.type === 'group' ? 'Group conversation' : conversation.type === 'sage' ? 'SAGE assistant' : 'Direct conversation'}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div
              aria-label={isConnected ? 'Live updates connected' : 'Live updates disconnected'}
              title={
                isConnected
                  ? 'Realtime notifications are connected.'
                  : 'Realtime notifications are disconnected. Messages still send over the API, but new updates will not appear instantly.'
              }
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs transition-opacity ${
                isConnected
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 opacity-80 hover:opacity-100'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 opacity-100'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              {isConnected ? 'Live Updates On' : 'Live Updates Off'}
              {!isConnected && (
                <Button variant="ghost" size="sm" className="ml-2 h-6 px-2 text-xs" onClick={() => onReconnect()}>
                  Retry
                </Button>
              )}
            </div>
            {conversation.type === 'group' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500 dark:text-gray-300">
                    <Users className="h-3.5 w-3.5 mr-1" />
                    {conversation.participantIds.length + 1} members
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2">
                  <div className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Group members
                  </div>
                  <div className="max-h-64 overflow-auto">
                    {groupMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200"
                      >
                        <div className="text-base">{member.avatar || member.name.charAt(0)}</div>
                        <div className="flex-1">
                          <div className="text-sm">{member.name}</div>
                          {member.isCurrentUser && <div className="text-xs text-gray-400">You</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      <div className="chat-message-area p-4 pt-6 bg-gray-50 dark:bg-gray-900 min-h-0">
        <div className="space-y-4">
          {isLoadingMessages && !messages.length && (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading messages...</div>
          )}

          {messages.map((message) => {
            const isOwn = message.senderId === currentUserId
            const showTraceButton =
              Boolean(message.senderId === 'sage' && message.isAiResponse) ||
              Boolean(message.source === 'chat_message' || message.source === 'chat_attachment' || message.attachment)
            const graphSyncFailed = message.graphSyncStatus === 'failed'
            const insightLabel = message.senderId === 'sage' && message.isAiResponse ? 'Answer insight' : 'Message insight'
            const displaySummary = message.answerPayload?.summary || message.content
            const displayBullets = message.answerPayload?.bullets || []
            const isSageAnswer = Boolean(message.senderId === 'sage' && message.isAiResponse)
            const persistedAgentEvents = isSageAnswer ? buildMessageAgentRailEvents(message) : []
            const showRetrievalRail = isSageAnswer && openRetrievalMessageId === message.id

            return (
              <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[70%]">
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      isOwn
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600'
                    }`}
                  >
                    {isSageAnswer && showRetrievalRail && (
                      <div className="mb-3">
                        <AgentExecutionRail
                          events={persistedAgentEvents}
                          className="border-gray-200 bg-gray-50/80 text-gray-700 dark:border-gray-600 dark:bg-gray-800/60 dark:text-gray-100"
                        />
                      </div>
                    )}

                    {/* TODO(agentic): Future planner-driven responses should still render through answerPayload so the chat bubble stays decoupled from backend execution flow. */}
                    <div className="whitespace-pre-wrap">{displaySummary}</div>

                    {displayBullets.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                        {displayBullets.map((bullet, index) => (
                          <li key={`${message.id}-bullet-${index}`}>{bullet}</li>
                        ))}
                      </ul>
                    )}

                    {message.attachment?.url && (
                      <div className="mt-2">
                        <a
                          href={message.attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 p-2 rounded ${
                            isOwn
                              ? 'bg-blue-400 hover:bg-blue-300'
                              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500'
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                          <div className="overflow-hidden">
                            <div className="text-sm font-medium truncate">{message.attachment.name}</div>
                            <div className="text-xs opacity-75">
                              {message.attachment.size ? `${(message.attachment.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                            </div>
                          </div>
                        </a>
                      </div>
                    )}
                  </div>

                  {graphSyncFailed && (
                    <div className="mt-1 text-xs text-red-500 dark:text-red-300">
                      Graph sync failed for this message.
                    </div>
                  )}

                  <div
                    className={`mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ${
                      isOwn ? 'justify-end' : 'justify-between'
                    }`}
                  >
                    <span>{formatMessageTime(message.sentAt)}</span>
                    <div className="flex items-center gap-1">
                      {isSageAnswer && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="rounded-full p-1 opacity-50 transition hover:bg-gray-100 hover:opacity-100 dark:hover:bg-gray-800"
                                onClick={() =>
                                  setOpenRetrievalMessageId((current) => (current === message.id ? null : message.id))
                                }
                                aria-label="Toggle retrieval overview"
                              >
                                <CircuitBoard className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{showRetrievalRail ? 'Hide retrieval overview' : 'Show retrieval overview'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="rounded-full p-1 opacity-50 transition hover:bg-gray-100 hover:opacity-100 dark:hover:bg-gray-800"
                              onClick={() => void handleCopyMessage(message)}
                              aria-label="Copy full message"
                            >
                              {copiedMessageId === message.id ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{copiedMessageId === message.id ? 'Copied' : 'Copy full message'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {showTraceButton && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="rounded-full p-1 opacity-50 transition hover:bg-gray-100 hover:opacity-100 dark:hover:bg-gray-800"
                                onClick={() => {
                                  setTraceMessage(message)
                                  setIsTraceOpen(true)
                                  setForceAdvancedTrace(false)
                                }}
                                aria-label={`Open ${insightLabel.toLowerCase()}`}
                              >
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{insightLabel}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {showTraceButton && message.trace?.agentic && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="rounded-full p-1 opacity-50 transition hover:bg-gray-100 hover:opacity-100 dark:hover:bg-gray-800"
                                onClick={() => {
                                  setTraceMessage(message)
                                  setForceAdvancedTrace(true)
                                  setIsTraceOpen(true)
                                }}
                                aria-label="Open advanced trace"
                              >
                                <CircuitBoard className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Advanced trace</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {Array.isArray(message.thinking) && message.thinking.length > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="rounded-full p-1 opacity-50 transition hover:bg-gray-100 hover:opacity-100 dark:hover:bg-gray-800"
                                onClick={() => {
                                  setThinkingMessage(message.thinking?.join('\n') || null)
                                  setIsThinkingOpen(true)
                                }}
                                aria-label="Show thinking"
                              >
                                <CircuitBoard className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Thinking</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {processingAttachmentName && (
            <div className="flex justify-start">
              <div className="max-w-[70%]">
                <div className="rounded-lg rounded-bl-none border border-gray-200 bg-white px-4 py-3 text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    <div>
                      <div className="font-medium">Processing attachment</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Adding "{processingAttachmentName}" to the graph with its real file contents.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Working...</div>
              </div>
            </div>
          )}

          {agentEvents.length > 0 && isSageConversation && (
            <div className="flex justify-start">
              <div className="max-w-[78%]">
                <div className="rounded-lg rounded-bl-none border border-gray-200 bg-white px-4 py-3 text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                    SAGE is working
                  </div>
                  <AgentExecutionRail events={agentEvents} />
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Thinking through the agent pipeline...</div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t p-2 pt-4 flex flex-col gap-2 flex-shrink-0 bg-white dark:bg-gray-800 dark:border-gray-700">
        {selectedFile && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-gray-700 rounded-md">
            <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            <span className="text-sm truncate flex-1">{selectedFile.name}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearSelectedFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {uploadError && (
          <div className="text-sm text-red-500 dark:text-red-400 px-2">{uploadError}</div>
        )}

        <div className="flex gap-2 items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isSending || Boolean(processingAttachmentName)}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach PDF, TXT, or DOCX file</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.txt,.docx"
            className="hidden"
          />

          <Input
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={conversation.type === 'sage' ? 'Ask SAGE anything...' : 'Type a message...'}
            className="flex-1 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
            disabled={isUploading || isSending || Boolean(processingAttachmentName)}
          />

          <Button
            onClick={() => void handleSendMessage()}
            size="icon"
            disabled={isUploading || isSending || Boolean(processingAttachmentName) || (!newMessage.trim() && !selectedFile)}
          >
            {isUploading || isSending || processingAttachmentName ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <MessageTraceSheet
        message={traceMessage}
        open={isTraceOpen}
        onOpenChange={setIsTraceOpen}
        forceAdvanced={forceAdvancedTrace}
      />
      {thinkingMessage && (
        <Sheet open={isThinkingOpen} onOpenChange={setIsThinkingOpen}>
          <SheetContent side="right" className="w-full max-w-full sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Thinking</SheetTitle>
              <SheetDescription>Model reasoning (sanitized)</SheetDescription>
            </SheetHeader>
            <ScrollArea className="mt-4 h-[80vh] pr-2">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100">{thinkingMessage}</pre>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
