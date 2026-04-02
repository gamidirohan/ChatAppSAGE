import { NextRequest, NextResponse } from 'next/server'

import { backendFetchJson, BackendProxyError } from '@/lib/server/backend'
import { getSessionUserId } from '@/lib/server/session'
import { User } from '@/types'

export async function PUT(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ detail: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const user = await backendFetchJson<User>('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      userId,
    })
    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof BackendProxyError) {
      return NextResponse.json(error.detail, { status: error.status })
    }
    return NextResponse.json({ detail: 'Failed to update profile' }, { status: 500 })
  }
}
