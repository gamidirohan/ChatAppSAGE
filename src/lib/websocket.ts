// WebSocket client utility for the frontend

let socket: WebSocket | null = null;
const messageCallbacks: ((message: any) => void)[] = [];
const connectionCallbacks: ((connected: boolean) => void)[] = [];
let reconnectTimeout: NodeJS.Timeout;
let isConnecting = false;

// Maximum number of connection attempts
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

export function connectWebSocket() {
  // Don't try to connect if we're already connected or connecting
  if (socket || isConnecting) return;

  // If we've exceeded the maximum number of attempts, don't try again
  if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    console.warn(`WebSocket connection failed after ${MAX_CONNECTION_ATTEMPTS} attempts. Giving up.`);
    connectionCallbacks.forEach(cb => cb(false));
    return;
  }

  isConnecting = true;
  connectionAttempts++;

  // Connect to the WebSocket server
  // In development, we'll try to connect to the local WebSocket server
  // In production, we'll connect to the same host as the app
  // Allow configuration via environment variable
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ||
    (process.env.NODE_ENV === 'production'
      ? `wss://${window.location.host}/ws`
      : 'ws://localhost:8080');

  console.log(`Attempting to connect to WebSocket server at ${wsUrl}...`);

  try {
    // Create a new WebSocket connection
    socket = new WebSocket(wsUrl);

    // Handle successful connection
    socket.onopen = () => {
      console.log('WebSocket connected');
      isConnecting = false;
      connectionAttempts = 0; // Reset connection attempts on successful connection
      connectionCallbacks.forEach(cb => cb(true));
    };

    // Handle incoming messages
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        messageCallbacks.forEach(cb => cb(data));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    // Handle connection close
    socket.onclose = (event) => {
      console.log(`WebSocket disconnected (code: ${event.code}, reason: ${event.reason || 'none'}), reconnecting...`);
      socket = null;
      isConnecting = false;
      connectionCallbacks.forEach(cb => cb(false));

      // Try to reconnect after a delay
      clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(connectWebSocket, 2000);
    };

    // Handle connection errors
    socket.onerror = (event) => {
      // The error event doesn't contain useful information in browsers due to security restrictions
      // We'll just log that an error occurred and let the onclose handler deal with reconnection
      console.warn('WebSocket error occurred - connection will be closed automatically');
      console.log('WebSocket error event:', event);

      // Notify all connection listeners about the error
      connectionCallbacks.forEach(cb => cb(false));

      // We don't need to manually close the socket as the browser will do this automatically
      // and trigger the onclose event, but we'll set the socket to null to be safe
      socket = null;
    };
  } catch (error) {
    // This catch block handles errors in setting up the WebSocket, not connection errors
    console.error('Error setting up WebSocket:', error instanceof Error ? error.message : 'Unknown error');
    isConnecting = false;
    connectionCallbacks.forEach(cb => cb(false));

    // Try to reconnect after a delay
    clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(connectWebSocket, 2000);
  }
}

export function sendMessage(type: string, payload: any) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, payload }));
    return true;
  }
  return false;
}

export function addMessageListener(callback: (message: any) => void) {
  messageCallbacks.push(callback);
  return () => {
    const index = messageCallbacks.indexOf(callback);
    if (index !== -1) messageCallbacks.splice(index, 1);
  };
}

export function addConnectionListener(callback: (connected: boolean) => void) {
  connectionCallbacks.push(callback);
  return () => {
    const index = connectionCallbacks.indexOf(callback);
    if (index !== -1) connectionCallbacks.splice(index, 1);
  };
}

export function closeWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
  clearTimeout(reconnectTimeout);
}

/**
 * Manually attempt to reconnect to the WebSocket server
 * This can be called when the automatic reconnection fails
 * or when the user wants to manually trigger a reconnection
 */
export function manualReconnect() {
  console.log('Manual reconnect function called');

  // Close existing socket if any
  if (socket) {
    console.log('Closing existing socket connection');
    try {
      socket.close();
    } catch (error) {
      console.error('Error closing socket:', error);
    }
    socket = null;
  } else {
    console.log('No existing socket to close');
  }

  // Clear any pending reconnect
  clearTimeout(reconnectTimeout);
  console.log('Cleared reconnect timeout');

  // Reset connecting flag and connection attempts
  isConnecting = false;
  connectionAttempts = 0;
  console.log('Reset connection state variables');

  // Force a small delay before attempting to connect
  console.log('Scheduling reconnection attempt after delay');
  setTimeout(() => {
    console.log('Executing delayed reconnection');
    // Attempt to connect
    connectWebSocket();

    // Notify all connection listeners that we're attempting to reconnect
    console.log(`Notifying ${connectionCallbacks.length} connection listeners`);
    connectionCallbacks.forEach(cb => cb(false));
  }, 500); // Increased delay for better stability

  return true;
}
