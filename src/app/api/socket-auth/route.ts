import { NextResponse } from 'next/server'

import { createSocketToken, getSessionUserId } from '@/lib/server/session'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ detail: 'Authentication required' }, { status: 401 })
  }

  return NextResponse.json({ token: createSocketToken(userId), userId })
}
