"use client"
import React, { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { useRoom } from "@/components/room/room-provider"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore"
import { MessageList } from "./MessageList"
import { MessageInput } from "./MessageInput"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Settings, Users, UserPlus } from "lucide-react"
import { RoomSettings } from "./chat/RoomSettings"
import EnhancedUserList from "./chat/enhanced-user-list"
import type { Message, SimpleUser } from "@/lib/types"

interface ChatInterfaceProps {
  roomId: string
}

export function ChatInterface({ roomId }: ChatInterfaceProps) {
  const { user } = useAuth()
  const { room } = useRoom()
  const [messages, setMessages] = useState<Message[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showInviteUsers, setShowInviteUsers] = useState(false)

  useEffect(() => {
    // Query messages for this specific room
    const q = query(collection(db, "rooms", roomId, "messages"), orderBy("createdAt"))

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData: Message[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        messagesData.push({
          id: doc.id,
          text: data.text,
          uid: data.uid,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          readBy: data.readBy || [],
          displayName: data.displayName || "Anonymous",
          photoURL: data.photoURL || "",
        })
      })
      setMessages(messagesData)
    })

    return () => unsubscribe()
  }, [roomId])

  const sendMessage = async (text: string) => {
    if (!user) return

    await addDoc(collection(db, "rooms", roomId, "messages"), {
      text,
      uid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      readBy: [user.uid],
      displayName: user.displayName,
      photoURL: user.photoURL,
    })
  }

  // Convert the Firebase user to our simplified user type
  const customUser: SimpleUser | null = user
    ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }
    : null

  // Check if current user is the room owner
  const isRoomOwner = room && user && room.ownerId === user.uid
  
  // Check if this is a DM room
  const isDMRoom = room?.isDM || (room?.members?.length === 2 && room?.isPrivate)

  return (
    <div className="flex flex-col h-full">
      {/* Room Header */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <h2 className="font-semibold">{room?.name || "Loading..."}</h2>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{room?.members?.length || 0} members</span>
                {room?.isPrivate && <span>• Private</span>}
                {isDMRoom && <span>• Direct Message</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isDMRoom && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInviteUsers(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Button>
            )}
            {isRoomOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} currentUser={customUser} />
      </div>
      
      {/* Message Input */}
      <MessageInput onSend={sendMessage} />

      {/* Settings Modal */}
      {showSettings && room && (
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <RoomSettings roomId={roomId} redirectUrl={`/room/${roomId}`} />
          </DialogContent>
        </Dialog>
      )}

      {/* Invite Users Modal */}
      {showInviteUsers && (
        <Dialog open={showInviteUsers} onOpenChange={setShowInviteUsers}>
          <DialogContent className="max-w-md">
            <EnhancedUserList 
              showDMButton={false}
              showInviteButton={true}
              roomId={roomId}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

