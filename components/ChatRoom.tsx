"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { MessageList } from "@/components/MessageList"
import { MessageInput } from "@/components/MessageInput"
import type { SimpleUser, Message } from "@/lib/types"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { CallControls } from "@/components/call-controls"
import { getSocket } from "@/lib/socket"
import { Button } from "@/components/ui/button"
import { Phone } from "lucide-react"

export function ChatRoom() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false)
  const socket = getSocket() // Get the socket instance

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt"))

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
          // Add other fields as needed
        })
      })
      setMessages(messagesData)
    })

    return () => unsubscribe()
  }, [])

  const sendMessage = async (text: string) => {
    if (!user) return

    await addDoc(collection(db, "messages"), {
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

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-primary p-4 text-primary-foreground flex justify-between items-center">
        <h1 className="text-xl font-bold">Chat Room</h1>
        <Button variant="outline" size="icon" onClick={() => setIsVoiceChatOpen(true)}>
          <Phone className="h-4 w-4" />
        </Button>
      </div>

      <MessageList messages={messages} currentUser={customUser} />
      <MessageInput onSend={sendMessage} />

      <Dialog open={isVoiceChatOpen} onOpenChange={setIsVoiceChatOpen}>
        <DialogContent className="sm:max-w-md">
          <CallControls
            isVideo={true}
            roomId="main-room"
            onEnd={() => setIsVoiceChatOpen(false)}
            socket={socket} // Pass the socket instance
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

