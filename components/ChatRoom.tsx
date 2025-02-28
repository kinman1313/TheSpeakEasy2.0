import type React from "react"

interface ChatRoomProps {
  roomId: string
}

const ChatRoom: React.FC<ChatRoomProps> = ({ roomId }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold">Chat Room: {roomId}</h2>
      <div className="mt-4">
        {/* Placeholder for chat messages */}
        <div className="space-y-2">
          <div className="p-2 bg-gray-100 rounded">Welcome to the chat room!</div>
        </div>
      </div>
    </div>
  )
}

export default ChatRoom

