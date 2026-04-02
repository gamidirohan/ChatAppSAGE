import crypto from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const SESSION_COOKIE_NAME = 'sage_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const SOCKET_TTL_MS = 60 * 60 * 1000

type TokenKind = 'session' | 'socket'

type SignedTokenPayload = {
  sub: string
  exp: number
  kind: TokenKind
}

function base64urlEncode(value: string) {
  return Buffer.from(value, 'utf-8').toString('base64url')
}

function base64urlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf-8')
}

function getSecret() {
  return process.env.SESSION_SECRET || 'sage-dev-session-secret'
}

function signPayload(payload: SignedTokenPayload) {
  const encodedPayload = base64urlEncode(JSON.stringify(payload))
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(encodedPayload)
    .digest('base64url')
  return `${encodedPayload}.${signature}`
}

function verifyToken(token: string | undefined, expectedKind: TokenKind): string | null {
  if (!token) {
    return null
  }

  const [encodedPayload, providedSignature] = token.split('.')
  if (!encodedPayload || !providedSignature) {
    return null
  }

  const actualSignature = crypto
    .createHmac('sha256', getSecret())
    .update(encodedPayload)
    .digest('base64url')

  const provided = Buffer.from(providedSignature)
  const actual = Buffer.from(actualSignature)
  if (provided.length !== actual.length || !crypto.timingSafeEqual(provided, actual)) {
    return null
  }

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload)) as SignedTokenPayload
    if (payload.kind !== expectedKind || payload.exp <= Date.now()) {
      return null
    }
    return payload.sub || null
  } catch {
    return null
  }
}

export function createSessionToken(userId: string) {
  return signPayload({
    sub: userId,
    exp: Date.now() + SESSION_TTL_MS,
    kind: 'session',
  })
}

export function createSocketToken(userId: string) {
  return signPayload({
    sub: userId,
    exp: Date.now() + SOCKET_TTL_MS,
    kind: 'socket',
  })
}

export function verifySocketToken(token: string | undefined) {
  return verifyToken(token, 'socket')
}

export async function getSessionUserId() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  return verifyToken(token, 'session')
}

export async function requireSessionUserId() {
  const userId = await getSessionUserId()
  if (!userId) {
    throw new Error('Authentication required')
  }
  return userId
}

export function attachSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
  return response
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return response
}
