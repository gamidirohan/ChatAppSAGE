import { NextResponse } from 'next/server'

import { backendFetchJson, BackendProxyError } from '@/lib/server/backend'
import { getSessionUserId } from '@/lib/server/session'

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ detail: 'Authentication required' }, { status: 401 })
    }

    const data = await backendFetchJson('/api/debug-graph')
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof BackendProxyError) {
      return NextResponse.json(error.detail, { status: error.status })
    }
    return NextResponse.json({ detail: 'Failed to fetch graph debug information' }, { status: 500 })
  }
}
