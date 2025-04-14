/**
 * Simple WebSocket server for the chat application
 *
 * Run this with: node websocket-server.js
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 8080;
const MESSAGES_FILE = path.join(__dirname, 'src', 'data', 'messages.json');

// Log the messages file path for debugging
console.log('Messages file path:', MESSAGES_FILE);

// Create WebSocket server with error handling
let wss;
try {
  wss = new WebSocket.Server({ port: PORT });
  console.log(`WebSocket server created successfully on port ${PORT}`);
} catch (error) {
  console.error(`Failed to create WebSocket server on port ${PORT}:`, error);
  process.exit(1); // Exit with error code
}

// Store connected clients
const clients = new Set();

// Helper function to read messages from file
function readMessages() {
  try {
    if (!fs.existsSync(MESSAGES_FILE)) {
      // Create empty messages file if it doesn't exist
      fs.writeFileSync(MESSAGES_FILE, '[]', 'utf8');
      return [];
    }
    const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading messages file:', error);
    return [];
  }
}

// Helper function to broadcast a message to all connected clients
function broadcast(message) {
  const messageString = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

// Handle server errors
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Handle new WebSocket connections
wss.on('connection', (ws, req) => {
  console.log(`Client connected from ${req.socket.remoteAddress}`);
  clients.add(ws);

  // Send initial messages to the client
  const messages = readMessages();
  ws.send(JSON.stringify({
    type: 'INITIAL_MESSAGES',
    payload: messages
  }));

  // Handle messages from clients
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received message:', data.type);

      if (data.type === 'NEW_MESSAGE') {
        // Add the message to the messages file
        const messages = readMessages();
        messages.push(data.payload);
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');

        // Broadcast the message to all clients
        broadcast({
          type: 'MESSAGE_CREATED',
          payload: data.payload
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
});

console.log(`WebSocket server running on port ${PORT}`);
