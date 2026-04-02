let socket: WebSocket | null = null
const messageCallbacks: Array<(message: any) => void> = []
const connectionCallbacks: Array<(connected: boolean) => void> = []
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
let isConnecting = false
let connectionAttempts = 0

const MAX_CONNECTION_ATTEMPTS = 3

async function getSocketToken() {
  const response = await fetch('/api/socket-auth', { cache: 'no-store' })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.token) {
    throw new Error(payload?.detail || 'Failed to create websocket token')
  }
  return payload.token as string
}

function notifyConnection(connected: boolean) {
  connectionCallbacks.forEach((callback) => callback(connected))
}

export async function connectWebSocket() {
  if (socket || isConnecting || typeof window === 'undefined') {
    return
  }

  if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    notifyConnection(false)
    return
  }

  isConnecting = true
  connectionAttempts += 1

  try {
    const token = await getSocketToken()
    const baseUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      (process.env.NODE_ENV === 'production' ? `wss://${window.location.host}/ws` : 'ws://localhost:8080/ws')
    const separator = baseUrl.includes('?') ? '&' : '?'
    socket = new WebSocket(`${baseUrl}${separator}token=${encodeURIComponent(token)}`)

    socket.onopen = () => {
      isConnecting = false
      connectionAttempts = 0
      notifyConnection(true)
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        messageCallbacks.forEach((callback) => callback(data))
      } catch (error) {
        console.error('Error parsing websocket message:', error)
      }
    }

    socket.onclose = () => {
      socket = null
      isConnecting = false
      notifyConnection(false)

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      reconnectTimeout = setTimeout(() => {
        void connectWebSocket()
      }, 2000)
    }

    socket.onerror = () => {
      notifyConnection(false)
    }
  } catch (error) {
    console.error('Failed to connect websocket:', error)
    isConnecting = false
    notifyConnection(false)

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
    }
    reconnectTimeout = setTimeout(() => {
      void connectWebSocket()
    }, 2000)
  }
}

export function addMessageListener(callback: (message: any) => void) {
  messageCallbacks.push(callback)
  return () => {
    const index = messageCallbacks.indexOf(callback)
    if (index !== -1) {
      messageCallbacks.splice(index, 1)
    }
  }
}

export function addConnectionListener(callback: (connected: boolean) => void) {
  connectionCallbacks.push(callback)
  return () => {
    const index = connectionCallbacks.indexOf(callback)
    if (index !== -1) {
      connectionCallbacks.splice(index, 1)
    }
  }
}

export function closeWebSocket() {
  if (socket) {
    socket.close()
    socket = null
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
}

export function manualReconnect() {
  closeWebSocket()
  isConnecting = false
  connectionAttempts = 0
  void connectWebSocket()
  notifyConnection(false)
  return true
}
