import groups from '@/data/groups.json'
import messages from '@/data/messages.json'
import users from '@/data/users.json'

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'

type BackendFetchOptions = RequestInit & {
  userId?: string
  skipBootstrap?: boolean
  timeoutMs?: number
}

type BootstrapGlobal = typeof globalThis & {
  __sageBootstrapPromise?: Promise<void>
}

export class BackendProxyError extends Error {
  status: number
  detail: unknown

  constructor(status: number, detail: unknown) {
    const message =
      typeof detail === 'string'
        ? detail
        : typeof detail === 'object' && detail && 'detail' in detail
          ? String((detail as { detail?: unknown }).detail)
          : `Backend request failed with status ${status}`
    super(message)
    this.status = status
    this.detail = detail
  }
}

async function parseBackendError(response: Response) {
  const text = await response.text()
  if (!text) {
    return { detail: `Backend request failed with status ${response.status}` }
  }

  try {
    return JSON.parse(text)
  } catch {
    return { detail: text }
  }
}

async function bootstrapBackendNow() {
  const response = await fetch(`${FASTAPI_URL}/api/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      users,
      groups,
      messages,
    }),
  })

  if (!response.ok) {
    throw new BackendProxyError(response.status, await parseBackendError(response))
  }
}

export async function ensureBackendBootstrap() {
  const root = globalThis as BootstrapGlobal
  if (!root.__sageBootstrapPromise) {
    root.__sageBootstrapPromise = bootstrapBackendNow().catch((error) => {
      root.__sageBootstrapPromise = undefined
      throw error
    })
  }
  await root.__sageBootstrapPromise
}

export async function backendFetch(path: string, options: BackendFetchOptions = {}) {
  const { userId, skipBootstrap, timeoutMs, headers, ...rest } = options
  if (!skipBootstrap) {
    await ensureBackendBootstrap()
  }

  const requestHeaders = new Headers(headers || {})
  if (userId) {
    requestHeaders.set('x-user-id', userId)
  }

  const controller = new AbortController()
  const timeoutId =
    typeof timeoutMs === 'number' && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null

  try {
    const response = await fetch(`${FASTAPI_URL}${path}`, {
      ...rest,
      headers: requestHeaders,
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new BackendProxyError(response.status, await parseBackendError(response))
    }

    return response
  } catch (error) {
    if ((error as { name?: string } | null)?.name === 'AbortError') {
      throw new BackendProxyError(504, { detail: 'Backend request timed out' })
    }
    throw error
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export async function backendFetchJson<T>(path: string, options: BackendFetchOptions = {}): Promise<T> {
  const response = await backendFetch(path, options)
  return (await response.json()) as T
}

export { FASTAPI_URL }
