import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const messagesFilePath = path.join(process.cwd(), 'src', 'data', 'messages.json');

// Ensure the data directory exists
const ensureDirectoryExists = () => {
  const dataDir = path.dirname(messagesFilePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Create an empty messages file if it doesn't exist
  if (!fs.existsSync(messagesFilePath)) {
    fs.writeFileSync(messagesFilePath, JSON.stringify([], null, 2));
  }
};

// GET handler to retrieve all messages
export async function GET() {
  try {
    ensureDirectoryExists();
    const data = fs.readFileSync(messagesFilePath, 'utf8');
    const messages = JSON.parse(data);
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error reading messages file:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

// POST handler to add a new message
export async function POST(request: NextRequest) {
  try {
    const message = await request.json();

    // Validate message
    if (!message.senderId || !message.receiverId || !message.content) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }

    // Read existing messages
    ensureDirectoryExists();
    const data = fs.readFileSync(messagesFilePath, 'utf8');
    const messages = JSON.parse(data);

    // Add new message with ID and timestamp if not provided
    const newMessage = {
      id: message.id || `msg_${Date.now()}`,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      timestamp: message.timestamp || new Date().toISOString(),
      read: message.read || false,
      // Preserve attachment if present
      ...(message.attachment ? { attachment: message.attachment } : {})
    };

    // Add to messages array
    messages.push(newMessage);

    // Write back to file
    fs.writeFileSync(messagesFilePath, JSON.stringify(messages, null, 2));

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error('Error saving message:', error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}
