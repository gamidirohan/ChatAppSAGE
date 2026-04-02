import { NextResponse } from 'next/server'

import { backendFetchJson, BackendProxyError, ensureBackendBootstrap } from '@/lib/server/backend'
import { clearSessionCookie, getSessionUserId } from '@/lib/server/session'
import { User } from '@/types'

export async function GET() {
  try {
    await ensureBackendBootstrap()
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ user: null })
    }

    const user = await backendFetchJson<User>('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })

    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof BackendProxyError && error.status === 404) {
      return clearSessionCookie(NextResponse.json({ user: null }))
    }
    if (error instanceof BackendProxyError) {
      return NextResponse.json(error.detail, { status: error.status })
    }
    return NextResponse.json({ detail: 'Failed to load session' }, { status: 500 })
  }
}
