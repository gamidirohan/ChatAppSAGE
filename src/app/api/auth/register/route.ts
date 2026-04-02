import { NextRequest, NextResponse } from 'next/server'

import { backendFetchJson, BackendProxyError } from '@/lib/server/backend'
import { attachSessionCookie } from '@/lib/server/session'
import { User } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const user = await backendFetchJson<User>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    return attachSessionCookie(NextResponse.json(user, { status: 201 }), user.id)
  } catch (error) {
    if (error instanceof BackendProxyError) {
      return NextResponse.json(error.detail, { status: error.status })
    }
    return NextResponse.json({ detail: 'Registration failed' }, { status: 500 })
  }
}
