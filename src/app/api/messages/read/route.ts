import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Message } from '@/types';

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

/**
 * POST handler to mark messages as read
 * 
 * Request body:
 * {
 *   userId: string,      // The ID of the current user
 *   otherUserId: string  // The ID of the other user in the conversation
 * }
 * 
 * This will mark all messages from otherUserId to userId as read
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, otherUserId } = await request.json();
    
    // Validate required fields
    if (!userId || !otherUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and otherUserId' },
        { status: 400 }
      );
    }
    
    // Read existing messages
    ensureDirectoryExists();
    const data = fs.readFileSync(messagesFilePath, 'utf8');
    const messages: Message[] = JSON.parse(data);
    
    // Find messages that need to be marked as read
    // (messages sent by otherUserId to userId that are currently unread)
    let updatedCount = 0;
    const updatedMessages = messages.map(message => {
      if (
        message.senderId === otherUserId && 
        message.receiverId === userId && 
        message.read === false
      ) {
        updatedCount++;
        return { ...message, read: true };
      }
      return message;
    });
    
    // Only write to file if there were changes
    if (updatedCount > 0) {
      fs.writeFileSync(messagesFilePath, JSON.stringify(updatedMessages, null, 2));
      
      // Notify via WebSocket if needed (future enhancement)
      
      return NextResponse.json({
        success: true,
        message: `Marked ${updatedCount} messages as read`,
        updatedCount
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'No unread messages to update',
      updatedCount: 0
    });
    
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
