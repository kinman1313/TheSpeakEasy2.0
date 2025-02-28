"use client"

import React from "react"
import { Sidebar } from "./Sidebar" // Note the curly braces
import ChatRoom from "./ChatRoom"

const ChatApp = () => {
  const [selectedRoom, setSelectedRoom] = React.useState<string | null>(null)

  return (
    <div className="flex h-screen">
      <div className="w-64 border-r">
        <Sidebar
          rooms={[
            { id: "1", name: "General", lastMessage: "Hello everyone!" },
            { id: "2", name: "Random", lastMessage: "What's up?" },
          ]}
          selectedRoomId={selectedRoom}
          onRoomSelect={setSelectedRoom}
        />
      </div>
      <div className="flex-1">
        {selectedRoom ? (
          <ChatRoom roomId={selectedRoom} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a room to start chatting
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatApp

