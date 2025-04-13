'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ChatWindow from '@/app/components/ChatWindow'
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-mobile"
import { useAuth } from '@/context/AuthContext'
import { getAllUsers } from '@/lib/userData'
import { format } from 'date-fns'
import { connectWebSocket, addMessageListener, addConnectionListener, manualReconnect } from '@/lib/websocket'
import { Message, UserWithLastMessage } from '@/types'
export default function ChatPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUserName, setSelectedUserName] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<UserWithLastMessage[]>([])
  const [isConnected, setIsConnected] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Load users and messages from database
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // Load users
        const userList = await getAllUsers();

        // Filter out current user
        const filteredUsers = user ? userList.filter(u => u.id !== user.id) : [];

        // Add last message info to each user
        const usersWithLastMessage = filteredUsers.map(u => {
          // Find the last message between current user and this user
            const relevantMessages = messages.filter((m: Message) =>
            (m.senderId === user.id && m.receiverId === u.id) ||
            (m.senderId === u.id && m.receiverId === user.id)
            );

          // Sort by timestamp, most recent first
            relevantMessages.sort((a: { timestamp: string }, b: { timestamp: string }) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

          // Check if there are any unread messages from this user
          const hasUnreadMessages = relevantMessages.some(
            m => m.senderId === u.id && m.receiverId === user.id && m.read === false
          );

          const lastMessage = relevantMessages.length > 0 ? {
            content: relevantMessages[0].content,
            timestamp: relevantMessages[0].timestamp,
            isUnread: hasUnreadMessages
          } : undefined;

          return {
            ...u,
            lastMessage
          };
        });

        // Sort users: pinned first, then by last message time
        const sortedUsers = usersWithLastMessage.sort((a, b) => {
          // Pinned items (like SAGE) always first
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;

          // Then sort by last message time if available
          if (a.lastMessage && b.lastMessage) {
            return new Date(b.lastMessage.timestamp).getTime() -
                   new Date(a.lastMessage.timestamp).getTime();
          }

          // If one has a message and other doesn't
          if (a.lastMessage && !b.lastMessage) return -1;
          if (!a.lastMessage && b.lastMessage) return 1;

          // Default to alphabetical by name
          return a.name.localeCompare(b.name);
        });

        setUsers(sortedUsers);

        // Default select SAGE if no user is selected
        if (!selectedUserId) {
          const sage = sortedUsers.find(u => u.id === 'sage');
          if (sage) {
            setSelectedUserId(sage.id);
            setSelectedUserName(sage.name);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [user, selectedUserId, messages]);

  // Load messages from API if WebSocket is not available
  const loadMessagesFromApi = async () => {
    try {
      const response = await fetch('/api/messages');
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading messages from API:', error);
    }
  };

  // Connect to WebSocket when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Try to connect to WebSocket
      connectWebSocket();

      // Listen for connection status changes
      const removeConnectionListener = addConnectionListener((connected) => {
        setIsConnected(connected);

        // If we couldn't connect to WebSocket, load messages from API
        if (!connected) {
          loadMessagesFromApi();
        }
      });

      // Listen for messages from WebSocket
      const removeMessageListener = addMessageListener((data) => {
        if (data.type === 'INITIAL_MESSAGES') {
          setMessages(data.payload);
        } else if (data.type === 'MESSAGE_CREATED') {
          // If we're currently viewing the conversation with this user,
          // mark the message as read immediately
          const newMessage = data.payload;
          if (
            user && // Make sure user is not null
            newMessage.senderId !== user.id &&
            newMessage.receiverId === user.id &&
            selectedUserId === newMessage.senderId
          ) {
            // We're currently viewing this conversation, so mark as read
            newMessage.read = true;

            // Also update on the server
            fetch('/api/messages/read', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: user.id,
                otherUserId: newMessage.senderId
              }),
            }).catch(err => console.error('Error marking message as read:', err));
          }

          setMessages(prev => [...prev, newMessage]);
        }
      });

      // Set a timeout to check if WebSocket connected
      const checkConnectionTimeout = setTimeout(() => {
        if (!isConnected) {
          console.log('WebSocket connection timeout, loading messages from API');
          loadMessagesFromApi();
        }
      }, 3000); // Wait 3 seconds for WebSocket to connect

      return () => {
        removeConnectionListener();
        removeMessageListener();
        clearTimeout(checkConnectionTimeout);
      };
    }
  }, [user, selectedUserId]); // Add dependencies

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      setCurrentUserId(user.id);
    }
  }, [user, loading, router]);

  // If still loading or not authenticated, show nothing
  if (loading || !user) {
    return null;
  }

  const handleSelectUser = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);

    // Mark messages from this user as read when selecting the conversation
    if (user) {
      fetch('/api/messages/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          otherUserId: userId
        }),
      })
      .then(response => response.json())
      .then(result => {
        if (result.updatedCount > 0) {
          // Update local state to reflect read status changes
          setMessages(prev => prev.map(m => {
            if (m.senderId === userId && m.receiverId === user.id && m.read === false) {
              return { ...m, read: true };
            }
            return m;
          }));
        }
      })
      .catch(err => console.error('Error marking messages as read:', err));
    }

    // On mobile, close the sheet after selecting a user
    if (isMobile) {
      const button = document.querySelector('.mobile-menu-close');
      if (button instanceof HTMLButtonElement) {
        button.click();
      }
    }
  };

  // Format the timestamp for display
  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'MMM d, h:mm a');
  };

  const userList = (
    <div className="w-full h-full overflow-y-auto bg-white dark:bg-gray-900">
      <div className="p-4 font-semibold dark:text-white">Contacts</div>
      <Separator className="dark:bg-gray-700" />
      <div className="space-y-1">
        {users.map((user) => (
          <div
            key={user.id}
            className={`p-3 rounded flex items-center gap-3 cursor-pointer
              hover:bg-gray-50 dark:hover:bg-gray-800 ${
              selectedUserId === user.id ? "bg-gray-50 dark:bg-gray-800" : ""
            }`}
            onClick={() => handleSelectUser(user.id, user.name)}
          >
            <div className="text-2xl relative">
              {user.avatar || '👤'}
              {user.lastMessage?.isUnread && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-baseline">
                <span className={`font-medium truncate ${user.lastMessage?.isUnread ? "font-semibold" : ""} dark:text-white`}>
                  {user.name}
                </span>
                {user.lastMessage && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 ml-1">
                    {formatTime(user.lastMessage.timestamp)}
                  </span>
                )}
              </div>
              {user.lastMessage && (
                <p className={`text-sm truncate ${
                  user.lastMessage.isUnread
                    ? "text-gray-900 font-medium dark:text-gray-200"
                    : "text-gray-600 dark:text-gray-400"
                }`}>
                  {user.lastMessage.content}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile: Sidebar in a Sheet */}
      {isMobile ? (
        <div className="fixed top-0 left-0 z-10 p-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[250px] sm:w-[300px] p-0">
              {userList}
              <button className="hidden mobile-menu-close">close</button>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        /* Desktop: Sidebar always visible */
        <div className="w-[320px] border-r h-full overflow-y-auto bg-white dark:border-gray-700">
          {userList}
        </div>
      )}

      {/* Chat window */}
      <div className={`${isMobile ? "w-full" : "flex-1"} h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 relative`}>
        {/* Connection status indicator */}
        <div className={`absolute top-2 right-2 flex items-center gap-2 px-3 py-1 rounded-full text-xs transition-opacity ${isConnected ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'} ${isConnected ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          {isConnected ? 'Connected' : 'Disconnected'}
          {!isConnected && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6 px-2 text-xs"
              onClick={() => manualReconnect()}
            >
              Reconnect
            </Button>
          )}
        </div>
        {selectedUserId ? (
          <ChatWindow
            currentUserId={currentUserId}
            otherUserId={selectedUserId}
            otherUserName={selectedUserName}
            allMessages={messages}
            setAllMessages={setMessages}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            Select a contact to start chatting
          </div>
        )}
      </div>
    </div>
  );
}