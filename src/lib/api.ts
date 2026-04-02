type UploadDocumentOptions = {
  conversationId?: string
  conversationType?: 'direct' | 'group' | 'sage'
  receiverId?: string
  receiverIds?: string[]
  groupId?: string
  sentAt?: string
  linkedMessageId?: string
  attachmentName?: string
  attachmentType?: string
  attachmentUrl?: string
  source?: string
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function uploadDocument(file: File, options: UploadDocumentOptions = {}) {
  const formData = new FormData()
  formData.append('file', file)

  if (options.conversationId) formData.append('conversation_id', options.conversationId)
  if (options.conversationType) formData.append('conversation_type', options.conversationType)
  if (options.receiverId) formData.append('receiver_id', options.receiverId)
  if (options.receiverIds) formData.append('receiver_ids_json', JSON.stringify(options.receiverIds))
  if (options.groupId) formData.append('group_id', options.groupId)
  if (options.sentAt) formData.append('sent_at', options.sentAt)
  if (options.linkedMessageId) formData.append('linked_message_id', options.linkedMessageId)
  if (options.attachmentName) formData.append('attachment_name', options.attachmentName)
  if (options.attachmentType) formData.append('attachment_type', options.attachmentType)
  if (options.attachmentUrl) formData.append('attachment_url', options.attachmentUrl)
  if (options.source) formData.append('source', options.source)

  const response = await fetch('/api/process-document', {
    method: 'POST',
    body: formData,
  })
  const payload = await parseJsonSafe<{ detail?: string; error?: string }>(response)
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.error || 'Failed to process document')
  }
  return payload
}

export async function getGraphDebugInfo() {
  const response = await fetch('/api/debug-graph', { cache: 'no-store' })
  const payload = await parseJsonSafe(response)
  if (!response.ok) {
    throw new Error((payload as { detail?: string } | null)?.detail || 'Failed to fetch graph debug information')
  }
  return payload
}

export async function checkApiHealth() {
  try {
    const response = await fetch('/api/health', { cache: 'no-store' })
    const payload = await parseJsonSafe<{ status?: string; error?: string }>(response)
    if (!response.ok) {
      throw new Error(payload?.error || `HTTP error ${response.status}`)
    }
    return payload || { status: 'ok' }
  } catch (error) {
    console.error('Error checking API health:', error)
    return { status: 'error', error: error instanceof Error ? error.message : String(error) }
  }
}
