import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types';
import { formatMessageAsDocument } from '@/lib/messageProcessor';

// Define the path to the messages file
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
// Helper function to read messages
const readMessages = (): Message[] => {
  try {
    ensureDirectoryExists();
    const data = fs.readFileSync(messagesFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading messages:', error);
    return [];
  }
};

// Helper function to write messages
const writeMessages = (messages: Message[]) => {
  try {
    ensureDirectoryExists();
    fs.writeFileSync(messagesFilePath, JSON.stringify(messages, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing messages:', error);
    return false;
  }
};

// Function to process a message as a document for the backend
async function processMessageForBackend(message: Message) {
  try {
    // Format the message as a document
    const formattedContent = formatMessageAsDocument(message);

    // Create a temporary file path
    const tempFilePath = path.join(process.cwd(), 'temp', `message-${message.id}.txt`);

    // Ensure temp directory exists
    const tempDir = path.dirname(tempFilePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write the formatted content to a temporary file
    fs.writeFileSync(tempFilePath, formattedContent);

    // Create a form data object
    const FormData = require('form-data');
    const formData = new FormData();

    // Add the file to the form data
    const fileStream = fs.createReadStream(tempFilePath);
    formData.append('file', fileStream);

    // Get the FastAPI URL from environment variables
    const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

    // Send the file to the process-document endpoint
    const fetch = require('node-fetch');
    const response = await fetch(`${FASTAPI_URL}/api/process-document`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to process message as document: ${response.status}`);
    }

    console.log('Message processed as document successfully');

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    return true;
  } catch (error) {
    console.error('Error processing message as document:', error);
    return false;
  }
};

/**
 * Webhook endpoint for receiving messages from external services
 *
 * This can be used to integrate with services like n8n, Zapier, or custom systems
 * that need to send data to your application.
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Optional: Validate webhook secret for security
    const secret = request.headers.get('x-webhook-secret');
    if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    // Handle FastAPI-specific payloads (no type field)
    if (!data.type && data.answer) {
      // This appears to be a response from the FastAPI chat endpoint
      const messages = readMessages();

      const newMessage: Message = {
        id: uuidv4(),
        content: data.answer,
        senderId: 'ai',
        receiverId: 'user',
        timestamp: new Date().toISOString(),
        read: false,
        thinking: data.thinking || [],
        isAiResponse: true
      };

      messages.push(newMessage);

      if (writeMessages(messages)) {
        // Process the AI response as a document for the backend (don't await)
        processMessageForBackend(newMessage).catch(err => {
          console.error('Failed to process AI response as document from webhook:', err);
        });

        return NextResponse.json({
          success: true,
          message: 'AI response saved successfully',
          data: newMessage
        }, { status: 201 });
      } else {
        return NextResponse.json({ error: 'Failed to save AI response' }, { status: 500 });
      }
    }

    // Process different webhook event types
    switch (data.type) {
      case 'NEW_MESSAGE': {
        // Validate required fields
        if (!data.payload || !data.payload.content) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Read existing messages
        const messages = readMessages();

        // Create a new message with required fields
        const newMessage: Message = {
          id: data.payload.id || uuidv4(),
          content: data.payload.content,
          senderId: data.payload.senderId || 'webhook',
          receiverId: data.payload.receiverId || 'system',
          // Format timestamp as ISO string to match existing format
          timestamp: data.payload.timestamp || new Date().toISOString(),
          read: data.payload.read !== undefined ? data.payload.read : false,
          // Include attachment if present
          ...(data.payload.attachment ? { attachment: data.payload.attachment } : {}),
          // Include any additional fields from the payload
          ...(typeof data.payload === 'object' ? data.payload : {})
        };

        // Add the new message
        messages.push(newMessage);

        // Write back to the file
        if (writeMessages(messages)) {
          // Process the message as a document for the backend (don't await)
          processMessageForBackend(newMessage).catch(err => {
            console.error('Failed to process message as document from webhook:', err);
          });

          return NextResponse.json({
            success: true,
            message: 'Message created successfully',
            data: newMessage
          }, { status: 201 });
        } else {
          return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
        }
      }

      case 'DELETE_MESSAGE': {
        if (!data.payload || !data.payload.id) {
          return NextResponse.json({ error: 'Missing message ID' }, { status: 400 });
        }

        // Read existing messages
        const messages = readMessages();

        // Filter out the message to delete
        const filteredMessages = messages.filter((msg: Message) => msg.id !== data.payload.id);

        // Check if any message was removed
        if (messages.length === filteredMessages.length) {
          return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        // Write back to the file
        if (writeMessages(filteredMessages)) {
          return NextResponse.json({
            success: true,
            message: 'Message deleted successfully'
          });
        } else {
          return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
        }
      }

      case 'DOCUMENT_PROCESSED': {
        // Handle document processing events
        if (!data.payload || !data.payload.documentId) {
          return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });
        }

        // Here you could store information about processed documents
        // For now, we'll just return a success response
        return NextResponse.json({
          success: true,
          message: 'Document processing event received',
          documentId: data.payload.documentId
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid webhook type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET handler for retrieving webhook status and recent events
 *
 * This endpoint can be used to check if the webhook is working properly
 * and to retrieve recent messages received through the webhook.
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Read messages
    const messages = readMessages();

    // Return the most recent messages (limited by the query parameter)
    return NextResponse.json({
      status: 'active',
      timestamp: new Date().toISOString(),
      recentEvents: messages.slice(-limit).reverse()
    });
  } catch (error) {
    console.error('Error reading messages file:', error);
    return NextResponse.json({
      error: 'Failed to load webhook data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
