import { NextRequest, NextResponse } from 'next/server'

import { backendFetch, backendFetchJson, BackendProxyError } from '@/lib/server/backend'
import { getSessionUserId } from '@/lib/server/session'

export const dynamic = 'force-dynamic'

function sse(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

export async function POST(request: NextRequest) {
  let userId: string | null = null
  let body: Record<string, unknown> | null = null

  try {
    userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ detail: 'Authentication required' }, { status: 401 })
    }

    body = (await request.json()) as Record<string, unknown>
    const response = await backendFetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        user_id: userId,
      }),
      timeoutMs: 0,
    })

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    if (error instanceof BackendProxyError) {
      if (error.status === 404 && userId && body) {
        try {
          const data = await backendFetchJson('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...body,
              user_id: userId,
            }),
          })
          return new Response(
            [
              sse('progress', {
                event_type: 'stream_fallback',
                agent: 'orchestrator',
                stage: 'compatibility',
                status: 'running',
                message: 'Streaming endpoint was unavailable; using standard SAGE chat response.',
              }),
              sse('final', data),
            ].join(''),
            {
              status: 200,
              headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
                'X-Accel-Buffering': 'no',
              },
            }
          )
        } catch (fallbackError) {
          if (fallbackError instanceof BackendProxyError) {
            return NextResponse.json(fallbackError.detail, { status: fallbackError.status })
          }
          return NextResponse.json({ detail: 'Failed to process fallback chat response' }, { status: 500 })
        }
      }
      return NextResponse.json(error.detail, { status: error.status })
    }
    return NextResponse.json({ detail: 'Failed to stream chat response' }, { status: 500 })
  }
}
