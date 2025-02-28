"use client"

import React from "react"
import { Sidebar } from "./sidebar"
import ChatRoom from "./ChatRoom"

const ChatApp = () => {
  const [selectedRoom, setSelectedRoom] = React.useState<string | null>(null)

  return (
    <div className="flex h-screen relative frost-bg">
      <div className="absolute inset-0 bg-gradient-to-b from-[#00C3FF]/5 to-transparent pointer-events-none" />
      <div className="w-64 glass border-r border-white/[0.08]">
        <Sidebar
          rooms={[
            { id: "1", name: "General", lastMessage: "Hello everyone!" },
            { id: "2", name: "Random", lastMessage: "What's up?" },
          ]}
          selectedRoomId={selectedRoom}
          onRoomSelect={setSelectedRoom}
        />
      </div>
      <div className="flex-1 glass-darker">
        {selectedRoom ? (
          <ChatRoom roomId={selectedRoom} />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-400">Select a room to start chatting</div>
        )}
      </div>
    </div>
  )
}

export default ChatApp