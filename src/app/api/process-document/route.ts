import { NextRequest, NextResponse } from 'next/server'

import { backendFetch, BackendProxyError } from '@/lib/server/backend'
import { getSessionUserId } from '@/lib/server/session'

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ detail: 'Authentication required' }, { status: 401 })
    }

    const formData = await request.formData()
    const forwarded = new FormData()

    for (const [key, value] of formData.entries()) {
      forwarded.append(key, value)
    }

    if (!forwarded.get('sender_id')) {
      forwarded.append('sender_id', userId)
    }

    const response = await backendFetch('/api/process-document', {
      method: 'POST',
      body: forwarded,
    })

    return NextResponse.json(await response.json())
  } catch (error) {
    if (error instanceof BackendProxyError) {
      return NextResponse.json(error.detail, { status: error.status })
    }
    return NextResponse.json({ detail: 'Failed to process document' }, { status: 500 })
  }
}
