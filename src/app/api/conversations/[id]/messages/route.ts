import { NextRequest, NextResponse } from 'next/server'

import { backendFetchJson, BackendProxyError } from '@/lib/server/backend'
import { getSessionUserId } from '@/lib/server/session'
import { broadcastSocketEvent } from '@/lib/server/websocket'
import { Message } from '@/types'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ detail: 'Authentication required' }, { status: 401 })
    }

    const { id } = await context.params
    const data = await backendFetchJson<{ messages: Message[] }>(`/api/conversations/${id}/messages`, {
      userId,
    })
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof BackendProxyError) {
      return NextResponse.json(error.detail, { status: error.status })
    }
    return NextResponse.json({ detail: 'Failed to load messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ detail: 'Authentication required' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const data = await backendFetchJson<{ message: Message; notifyUserIds: string[] }>(
      `/api/conversations/${id}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        userId,
      }
    )

    await broadcastSocketEvent({
      type: 'MESSAGE_CREATED',
      userIds: [userId, ...data.notifyUserIds],
      conversationId: id,
      messageId: data.message.id,
      groupId: data.message.groupId || undefined,
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    if (error instanceof BackendProxyError) {
      return NextResponse.json(error.detail, { status: error.status })
    }
    return NextResponse.json({ detail: 'Failed to create message' }, { status: 500 })
  }
}
