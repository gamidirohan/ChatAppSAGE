'use client'

type Props = {
  currentUserId: string | null
  conversationMap: Record<string, any[]>
  selectedUser: string | null
  setSelectedUser: (userId: string) => void
}

export default function ChatSidebar({
  currentUserId,
  conversationMap,
  selectedUser,
  setSelectedUser,
}: Props) {
  return (
    <div className="w-64 bg-gray-100 p-4 overflow-y-auto">
      <h2 className="font-bold mb-4">Chats</h2>
      {Object.keys(conversationMap).map((otherId) => (
        <div
          key={otherId}
          className={`p-2 mb-2 cursor-pointer rounded ${
            selectedUser === otherId ? 'bg-gray-300' : 'bg-gray-200'
          }`}
          onClick={() => setSelectedUser(otherId)}
        >
          Chat with {otherId}
        </div>
      ))}
    </div>
  )
}
