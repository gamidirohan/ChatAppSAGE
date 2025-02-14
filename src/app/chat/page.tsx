// app/chat/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Users } from 'lucide-react'
import ChatWindow from '@/app/components/ChatWindow' // Correct import path

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const currentUserId = searchParams.get('userId');

  useEffect(() => {
    if (!currentUserId) return; // Guard clause if userId is missing

    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/messages');
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`); // Handle fetch errors
        }
        const data = await res.json();
        setMessages(data);
      } catch (error) {
        console.error("Error fetching messages:", error);
        // Implement error handling UI, e.g., display an error message
      }
    };

    fetchMessages();
  }, [currentUserId]); // Add currentUserId to dependency array

  const userMessages = messages.filter(
    (msg) => msg.senderId === currentUserId || msg.receiverId === currentUserId
  );

  const conversationMap: Record<string, any[]> = {};
  userMessages.forEach((msg) => {
    const otherParty = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
    if (!conversationMap[otherParty]) {
      conversationMap[otherParty] = [];
    }
    conversationMap[otherParty].push(msg);
  });

  const otherUsers = Object.keys(conversationMap);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Chats</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {otherUsers.map((otherId) => (
                  <SidebarMenuItem key={otherId}>
                    <SidebarMenuButton asChild>
                      <button
                        className={`w-full text-left ${selectedUser === otherId ? 'bg-gray-200' : ''} p-2 rounded`}
                        onClick={() => setSelectedUser(otherId)}
                      >
                        <Users className="mr-2 h-4 w-4 inline-block" />
                        <span>{otherId}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <main className="flex-1 ml-64 p-4">
        <SidebarTrigger />
        {currentUserId ? ( // Conditionally render ChatWindow
          selectedUser ? (
            <ChatWindow
              currentUserId={currentUserId}
              otherUserId={selectedUser}
              allMessages={messages}
              setAllMessages={setMessages}
            />
          ) : (
            <p>Select a conversation from the sidebar.</p>
          )
        ) : (
          <p>Loading chat...</p> // Or handle missing currentUserId
        )}
      </main>
    </SidebarProvider>
  );
}