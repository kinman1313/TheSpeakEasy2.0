"use client"

import { useState } from "react"
import { Sidebar } from "@/components/Sidebar"
import ChatRoom from "@/components/ChatRoom"
import { useAuth } from "@/components/AuthProvider"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { UserProfile } from "@/components/UserProfile"
import { RoomSettings } from "@/components/RoomSettings"

export default function ChatApp() {
  const { user } = useAuth()
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  if (!user) return null

  return (
    <div className="flex h-screen bg-background">
      <div className="w-64 border-r border-border">
        <Sidebar
          onProfileClick={() => setIsProfileOpen(true)}
          onRoomSelect={setSelectedRoom}
          selectedRoomId={selectedRoom}
          onRoomSettingsClick={() => selectedRoom && setIsSettingsOpen(true)}
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

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-[425px] bg-background text-foreground">
          <UserProfile onClose={() => setIsProfileOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[425px] bg-background text-foreground">
          <RoomSettings roomId={selectedRoom!} onClose={() => setIsSettingsOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

