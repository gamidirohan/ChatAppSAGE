import { NextResponse } from 'next/server'

import { backendFetchJson, BackendProxyError } from '@/lib/server/backend'
import { getSessionUserId } from '@/lib/server/session'
import { broadcastSocketEvent } from '@/lib/server/websocket'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ detail: 'Authentication required' }, { status: 401 })
    }

    const { id } = await context.params
    const data = await backendFetchJson<{ success: boolean; messageId: string; conversationId: string; notifyUserIds: string[] }>(
      `/api/messages/${id}/read`,
      {
        method: 'POST',
        userId,
      }
    )

    await broadcastSocketEvent({
      type: 'MESSAGE_READ',
      userIds: [userId, ...data.notifyUserIds],
      conversationId: data.conversationId,
      messageId: data.messageId,
    })

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof BackendProxyError) {
      return NextResponse.json(error.detail, { status: error.status })
    }
    return NextResponse.json({ detail: 'Failed to update read state' }, { status: 500 })
  }
}
