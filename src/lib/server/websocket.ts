const WS_BROADCAST_URL = process.env.WS_BROADCAST_URL || 'http://localhost:8080/broadcast'
const WS_INTERNAL_SECRET = process.env.WS_INTERNAL_SECRET || process.env.SESSION_SECRET || 'sage-dev-session-secret'

type SocketEventPayload = {
  type: 'MESSAGE_CREATED' | 'MESSAGE_READ' | 'GROUP_UPDATED'
  userIds: string[]
  conversationId?: string
  messageId?: string
  groupId?: string
}

export async function broadcastSocketEvent(payload: SocketEventPayload) {
  if (!payload.userIds.length) {
    return
  }

  try {
    await fetch(WS_BROADCAST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': WS_INTERNAL_SECRET,
      },
      cache: 'no-store',
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error('Failed to broadcast websocket event:', error)
  }
}
