'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Paperclip, FileText, X } from "lucide-react"
import { getUser } from "../../lib/userData"
import { format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import { sendMessage } from '@/lib/websocket'
import { Message, FileAttachment } from '@/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { processMessageAsDocument } from '@/lib/messageProcessor'

type Props = {
  currentUserId: string
  otherUserId: string
  allMessages: Message[]
  setAllMessages: (messages: ((prev: Message[]) => Message[]) | Message[]) => void
  otherUserName?: string
}

export default function ChatWindow({
    currentUserId,
    otherUserId,
    allMessages,
    setAllMessages,
    otherUserName,
  }: Props) {
    const [relevantMessages, setRelevantMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [displayName, setDisplayName] = useState(otherUserName || '');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      // Get user name if not provided
      if (!otherUserName) {
        getUser(otherUserId).then(user => {
          if (user) setDisplayName(user.name);
        });
      } else {
        setDisplayName(otherUserName);
      }
    }, [otherUserId, otherUserName]);

    useEffect(() => {
      // Filter messages relevant to the current chat (just between these two users)
      const filteredMessages = allMessages.filter(
        (m) => (m.senderId === currentUserId && m.receiverId === otherUserId) ||
               (m.senderId === otherUserId && m.receiverId === currentUserId) ||
               // Handle the case where the current user ID is 'currentUser' in messages
               (m.senderId === 'currentUser' && m.receiverId === otherUserId) ||
               (m.senderId === otherUserId && m.receiverId === 'currentUser')
      );

      // Log the filtered messages for debugging
      console.log(`Filtered messages for chat with ${otherUserId}:`, filteredMessages.length);
      console.log('Current user ID:', currentUserId);
      console.log('Other user ID:', otherUserId);

      // Sort by timestamp
      filteredMessages.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setRelevantMessages(filteredMessages);

      // Scroll to bottom when messages change
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Mark messages as read when viewing the conversation
      const markMessagesAsRead = async () => {
        try {
          // Check if there are any unread messages from the other user
          const hasUnreadMessages = filteredMessages.some(
            m => m.senderId === otherUserId && m.receiverId === currentUserId && m.read === false
          );

          if (hasUnreadMessages) {
            // Call the API to mark messages as read
            const response = await fetch('/api/messages/read', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: currentUserId,
                otherUserId: otherUserId
              }),
            });

            if (response.ok) {
              const result = await response.json();
              console.log('Marked messages as read:', result);

              // Update the local state to reflect the changes
              if (result.updatedCount > 0) {
                setAllMessages(prev => prev.map(m => {
                  if (m.senderId === otherUserId && m.receiverId === currentUserId && m.read === false) {
                    return { ...m, read: true };
                  }
                  return m;
                }));
              }
            }
          }
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      };

      // Call the function to mark messages as read
      markMessagesAsRead();
    }, [allMessages, currentUserId, otherUserId, setAllMessages]);

    useEffect(() => {
      // Scroll to bottom when new messages arrive
      const scrollToBottom = () => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      };

      scrollToBottom();

      // Also try after a small delay (for loaded images, etc)
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }, [relevantMessages]);

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        setSelectedFile(files[0]);
        setUploadError(null);
      }
    };

    // Handle file upload
    const uploadFile = async (file: File): Promise<FileAttachment | null> => {
      setIsUploading(true);
      setUploadError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload file');
        }

        const data = await response.json();
        return data.file;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setUploadError(errorMessage);
        console.error('Error uploading file:', error);
        return null;
      } finally {
        setIsUploading(false);
      }
    };

    // Clear selected file
    const clearSelectedFile = () => {
      setSelectedFile(null);
      setUploadError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const handleSendMessage = async () => {
      // Don't send if there's no message and no file
      if (!newMessage.trim() && !selectedFile) return;

      let attachment: FileAttachment | undefined;

      // Upload file if selected
      if (selectedFile) {
        const uploadedFile = await uploadFile(selectedFile);
        if (uploadedFile) {
          attachment = uploadedFile;
        } else {
          // If file upload failed, don't send the message
          return;
        }
      }

      // Check if this is a message to SAGE (AI assistant)
      const isSageChat = otherUserId === 'sage';

      if (isSageChat) {
        // Handle SAGE chat differently - use the AI backend
        const userMessage: Message = {
          id: uuidv4(),
          senderId: currentUserId,
          receiverId: otherUserId,
          content: newMessage.trim() || (attachment ? `Sent a file: ${attachment.name}` : ''),
          timestamp: new Date().toISOString(),
          read: true,
          attachment,
          role: 'user'
        };

        // Save the user message via WebSocket or API for persistence
        // Note: We don't update local state here because the WebSocket listener will do that
        const sentViaWebSocket = sendMessage('NEW_MESSAGE', userMessage);

        if (!sentViaWebSocket) {
          await fetch('/api/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userMessage),
          });
        }

        // Process the user message as a document for the knowledge graph
        processMessageAsDocument(userMessage).catch(err => {
          console.error('Failed to process user message as document:', err);
        });

        // Clear input and selected file
        setNewMessage('');
        clearSelectedFile();

        try {
          // Get previous messages for context
          const relevantMessages = allMessages.filter(
            (m) => (m.senderId === currentUserId && m.receiverId === 'sage') ||
                   (m.senderId === 'sage' && m.receiverId === currentUserId)
          ).slice(-10); // Only use last 10 messages for context

          // Call the AI backend
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: userMessage.content,
              history: relevantMessages.map(m => ({
                role: m.senderId === currentUserId ? 'user' : 'assistant',
                content: m.content
              }))
            }),
          });

          if (!response.ok) {
            throw new Error(`Error from API: ${response.status}`);
          }

          const data = await response.json();

          // Create AI response message
          const aiMessage: Message = {
            id: uuidv4(),
            senderId: 'sage',
            receiverId: currentUserId,
            content: data.answer,
            timestamp: new Date().toISOString(),
            read: false,
            thinking: data.thinking || [],
            isAiResponse: true,
            role: 'assistant'
          };

          // Save the AI response via WebSocket or API for persistence
          // Note: We don't update local state here because the WebSocket listener will do that
          const sentViaWebSocket = sendMessage('NEW_MESSAGE', aiMessage);

          if (!sentViaWebSocket) {
            await fetch('/api/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(aiMessage),
            });
          }

          // Process the AI response as a document for the knowledge graph
          processMessageAsDocument(aiMessage).catch(err => {
            console.error('Failed to process AI response as document:', err);
          });

          // Scroll to bottom after receiving AI response
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        } catch (error) {
          console.error('Error getting AI response:', error);

          // Add error message
          const errorMessage: Message = {
            id: uuidv4(),
            senderId: 'sage',
            receiverId: currentUserId,
            content: 'Sorry, I encountered an error processing your request. Please try again later.',
            timestamp: new Date().toISOString(),
            read: false,
            isAiResponse: true,
            role: 'assistant'
          };

          // Save the error message via WebSocket or API for persistence
          const sentViaWebSocket = sendMessage('NEW_MESSAGE', errorMessage);

          if (!sentViaWebSocket) {
            await fetch('/api/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(errorMessage),
            });
          }
        }
      } else {
        // Regular user-to-user chat
        const message = {
          id: uuidv4(),
          senderId: currentUserId,
          receiverId: otherUserId,
          content: newMessage.trim() || (attachment ? `Sent a file: ${attachment.name}` : ''),
          timestamp: new Date().toISOString(),
          read: false,
          attachment
        };

        // Save the message via WebSocket or API for persistence
        // Note: We don't update local state here because the WebSocket listener will do that
        const sentViaWebSocket = sendMessage('NEW_MESSAGE', message);

        // If WebSocket is not available, send via REST API
        if (!sentViaWebSocket) {
          try {
            console.log('WebSocket unavailable, sending message via API');
            const response = await fetch('/api/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(message),
            });

            if (!response.ok) {
              console.error('Failed to send message via API:', await response.text());
            }
          } catch (error) {
            console.error('Error sending message via API:', error);
          }
        }

        // Process the message as a document for the knowledge graph
        // This happens in the background and doesn't block the UI
        processMessageAsDocument(message).catch(err => {
          console.error('Failed to process message as document:', err);
        });

        // Clear input and selected file
        setNewMessage('');
        clearSelectedFile();

        // Scroll to bottom after sending a message
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    };

    // Format timestamp for display
    const formatMessageTime = (timestamp: string) => {
      return format(new Date(timestamp), 'h:mm a');
    };

    return (
      <div className="flex flex-col h-full">
        {/* Chat header */}
        <div className="px-4 py-2 border-b flex-shrink-0 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="font-medium dark:text-white">Chat with {displayName}</div>
        </div>

        {/* Message area */}
        <div className="chat-message-area p-4 pt-6 bg-gray-50 dark:bg-gray-900">
          <div className="space-y-4">
            {relevantMessages.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.senderId === currentUserId ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className="max-w-[70%]">
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      m.senderId === currentUserId
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600'
                    }`}
                  >
                    {/* Message content */}
                    <div>{m.content}</div>

                    {/* File attachment */}
                    {m.attachment && m.attachment.url && (
                      <div className="mt-2">
                        <a
                          href={m.attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 p-2 rounded ${m.senderId === currentUserId ? 'bg-blue-400 hover:bg-blue-300' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500'}`}
                        >
                          <FileText className="h-4 w-4" />
                          <div className="overflow-hidden">
                            <div className="text-sm font-medium truncate">{m.attachment.name}</div>
                            <div className="text-xs opacity-75">{m.attachment.size ? `${(m.attachment.size / 1024).toFixed(1)} KB` : 'Unknown size'}</div>
                          </div>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Display thinking process for AI messages */}
                  {m.thinking && m.thinking.length > 0 && m.senderId === 'sage' && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <details>
                        <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">Show thinking process</summary>
                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded border text-xs font-mono whitespace-pre-wrap">
                          {m.thinking.join('\n')}
                        </div>
                      </details>
                    </div>
                  )}
                  <div
                    className={`text-xs mt-1 ${
                      m.senderId === currentUserId ? 'text-right' : 'text-left'
                    } text-gray-500 dark:text-gray-400`}
                  >
                    {formatMessageTime(m.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="border-t p-2 pt-4 flex flex-col gap-2 flex-shrink-0 bg-white dark:bg-gray-800 dark:border-gray-700 sticky bottom-0">
          {/* File upload preview */}
          {selectedFile && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-gray-700 rounded-md">
              <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              <span className="text-sm truncate flex-1">{selectedFile.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={clearSelectedFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Error message */}
          {uploadError && (
            <div className="text-sm text-red-500 dark:text-red-400 px-2">
              {uploadError}
            </div>
          )}

          {/* Input and buttons */}
          <div className="flex gap-2 items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach PDF or TXT file</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.txt,.docx"
              className="hidden"
            />

            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              disabled={isUploading}
            />

            <Button
              onClick={handleSendMessage}
              size="icon"
              disabled={isUploading || (!newMessage.trim() && !selectedFile)}
            >
              {isUploading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }