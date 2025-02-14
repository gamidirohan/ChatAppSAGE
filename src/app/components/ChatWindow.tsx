'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

type Props = {
  currentUserId: string
  otherUserId: string
  allMessages: any[]
  setAllMessages: (messages: ((prev: any[]) => any[]) | any[]) => void
}

export default function ChatWindow({
    currentUserId,
    otherUserId,
    allMessages,
  }: Props) {
    // ... (state and other variables)
    const [relevantMessages, setRelevantMessages] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      // Filter messages relevant to the current chat
      const filteredMessages = allMessages.filter(
        (m) => m.senderId === currentUserId || m.senderId === otherUserId
      );
      setRelevantMessages(filteredMessages);
    }, [allMessages, currentUserId, otherUserId]);
  
    useEffect(() => {
      // Scroll to bottom when new messages arrive
      const scrollArea = document.querySelector('.scroll-area'); // Select the ScrollArea
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }, [relevantMessages]);
  
  
    return (
      <div className="flex flex-col h-full">
        <ScrollArea className="flex-1 overflow-y-auto border p-2 scroll-area"> {/* Added scroll-area class */}
          <div className="h-full"> {/* Important: Add a container with full height */}
            {relevantMessages.map((m) => (
              <div
                key={m.id}
                className={`mb-2 ${
                  m.senderId === currentUserId ? 'text-right' : 'text-left'
                }`}
              >
                <span
                  className={`inline-block px-2 py-1 rounded ${
                    m.senderId === currentUserId ? 'bg-blue-200' : 'bg-gray-200'
                  }`}
                >
                  {m.content}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} /> {/* Ref for scrolling */}
          </div>
        </ScrollArea>
  
        {/* ... (rest of the component - input and button) */}
      </div>
    )
  }