const crypto = require('crypto')
const http = require('http')
const { URL } = require('url')

const WebSocket = require('ws')

const PORT = Number(process.env.PORT || 8080)
const SESSION_SECRET = process.env.SESSION_SECRET || 'sage-dev-session-secret'
const WS_INTERNAL_SECRET = process.env.WS_INTERNAL_SECRET || SESSION_SECRET

const userSockets = new Map()

function verifySocketToken(token) {
  if (!token) {
    return null
  }

  const [encodedPayload, providedSignature] = token.split('.')
  if (!encodedPayload || !providedSignature) {
    return null
  }

  const actualSignature = crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest('base64url')
  const provided = Buffer.from(providedSignature)
  const actual = Buffer.from(actualSignature)
  if (provided.length !== actual.length || !crypto.timingSafeEqual(provided, actual)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'))
    if (payload.kind !== 'socket' || payload.exp <= Date.now()) {
      return null
    }
    return payload.sub || null
  } catch {
    return null
  }
}

function addSocketForUser(userId, socket) {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set())
  }
  userSockets.get(userId).add(socket)
}

function removeSocketForUser(userId, socket) {
  const sockets = userSockets.get(userId)
  if (!sockets) {
    return
  }

  sockets.delete(socket)
  if (!sockets.size) {
    userSockets.delete(userId)
  }
}

function broadcastToUsers(payload) {
  const uniqueUserIds = Array.from(new Set(payload.userIds || []))
  const message = JSON.stringify(payload)

  uniqueUserIds.forEach((userId) => {
    const sockets = userSockets.get(userId)
    if (!sockets) {
      return
    }

    sockets.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message)
      }
    })
  })
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', connectedUsers: userSockets.size }))
    return
  }

  if (req.method === 'POST' && req.url === '/broadcast') {
    const internalSecret = req.headers['x-internal-secret']
    if (internalSecret !== WS_INTERNAL_SECRET) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return
    }

    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}')
        if (!Array.isArray(payload.userIds) || !payload.type) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Invalid payload' }))
          return
        }

        broadcastToUsers(payload)
        res.writeHead(202, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid JSON' }))
      }
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

const wss = new WebSocket.Server({ server, path: '/ws' })

wss.on('connection', (socket, req) => {
  const url = new URL(req.url, 'http://localhost')
  const token = url.searchParams.get('token')
  const userId = verifySocketToken(token)

  if (!userId) {
    socket.close(4001, 'Invalid token')
    return
  }

  addSocketForUser(userId, socket)
  socket.send(JSON.stringify({ type: 'CONNECTED', userId }))

  socket.on('message', () => {
    // Notification-only channel. Client-originated messages are ignored.
  })

  socket.on('close', () => {
    removeSocketForUser(userId, socket)
  })
})

server.listen(PORT, () => {
  console.log(`WebSocket notification server running on port ${PORT}`)
})
