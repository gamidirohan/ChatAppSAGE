import { NextResponse } from 'next/server'

import { backendFetchJson, BackendProxyError } from '@/lib/server/backend'
import { getSessionUserId } from '@/lib/server/session'
import { ConversationSummary } from '@/types'

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ detail: 'Authentication required' }, { status: 401 })
    }

    const data = await backendFetchJson<{ conversations: ConversationSummary[] }>('/api/conversations', {
      userId,
    })
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof BackendProxyError) {
      return NextResponse.json(error.detail, { status: error.status })
    }
    return NextResponse.json({ detail: 'Failed to load conversations' }, { status: 500 })
  }
}
