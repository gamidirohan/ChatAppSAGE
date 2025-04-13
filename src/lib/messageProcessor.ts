/**
 * Utility functions for processing messages for the backend
 */
import { Message } from '@/types';

/**
 * Format a chat message as a document for the backend
 * 
 * @param message The message to format
 * @returns A formatted string representing the message as a document
 */
export function formatMessageAsDocument(message: Message): string {
  // Create a formatted document string
  const formattedContent = [
    `Sender ID: ${message.senderId}`,
    `Receiver ID: ${message.receiverId}`,
    `Message: ${message.content}`,
    `Sent Time: ${message.timestamp}`,
    message.attachment ? `Attachment: ${message.attachment.name}` : '',
  ].filter(Boolean).join('\n');

  return formattedContent;
}

/**
 * Send a message to the backend for processing as a document
 * 
 * @param message The message to process
 */
export async function processMessageAsDocument(message: Message): Promise<void> {
  try {
    // Format the message as a document
    const formattedContent = formatMessageAsDocument(message);
    
    // Create a text file from the formatted content
    const blob = new Blob([formattedContent], { type: 'text/plain' });
    const file = new File([blob], `message-${message.id}.txt`, { type: 'text/plain' });
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Send to the process-document endpoint
    const response = await fetch('/api/process-document', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to process message as document: ${response.status}`);
    }
    
    console.log('Message processed as document successfully');
  } catch (error) {
    console.error('Error processing message as document:', error);
    // Don't throw the error - we don't want to interrupt the chat flow
  }
}
