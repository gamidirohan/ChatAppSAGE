import { NextRequest, NextResponse } from 'next/server'

import { backendFetchJson, BackendProxyError } from '@/lib/server/backend'
import { getSessionUserId } from '@/lib/server/session'

const DEBUG_GRAPH_TIMEOUT_MS = 10000
const DEBUG_GRAPH_SUMMARY_TIMEOUT_MS = 20000

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ detail: 'Authentication required' }, { status: 401 })
    }

    const search = request.nextUrl.search
    const summaryOnly = ['1', 'true'].includes((request.nextUrl.searchParams.get('summary_only') || '').toLowerCase())
    const debugAuthToken = process.env.DEBUG_GRAPH_AUTH_TOKEN
    const data = await backendFetchJson(`/api/debug-graph${search}`, {
      skipBootstrap: true,
      timeoutMs: summaryOnly ? DEBUG_GRAPH_SUMMARY_TIMEOUT_MS : DEBUG_GRAPH_TIMEOUT_MS,
      headers: debugAuthToken ? { 'X-Debug-Auth': debugAuthToken } : undefined,
    })
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof BackendProxyError) {
      return NextResponse.json(error.detail, { status: error.status })
    }
    return NextResponse.json({ detail: 'Failed to fetch graph debug information' }, { status: 500 })
  }
}
