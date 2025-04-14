/**
 * Simple WebSocket client test script
 * 
 * Run this with: node test-websocket.js
 */

const WebSocket = require('ws');

// WebSocket server URL
const WS_URL = 'ws://localhost:8080';

console.log(`Attempting to connect to WebSocket server at ${WS_URL}...`);

// Create WebSocket connection
const ws = new WebSocket(WS_URL);

// Connection opened
ws.on('open', () => {
  console.log('Connection established successfully!');
  
  // Send a test message
  const testMessage = {
    type: 'TEST_MESSAGE',
    payload: {
      message: 'Hello from test client!',
      timestamp: new Date().toISOString()
    }
  };
  
  console.log('Sending test message:', testMessage);
  ws.send(JSON.stringify(testMessage));
  
  // Close the connection after 2 seconds
  setTimeout(() => {
    console.log('Test complete, closing connection...');
    ws.close();
    process.exit(0);
  }, 2000);
});

// Listen for messages
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('Received message from server:', message);
  } catch (error) {
    console.error('Error parsing message:', error);
    console.log('Raw message:', data.toString());
  }
});

// Handle errors
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
  process.exit(1);
});

// Connection closed
ws.on('close', (code, reason) => {
  console.log(`Connection closed: Code ${code}, Reason: ${reason || 'No reason provided'}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Process terminated, closing WebSocket connection...');
  ws.close();
  process.exit(0);
});
