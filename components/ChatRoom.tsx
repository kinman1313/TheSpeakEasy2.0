"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/AuthProvider"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, where } from "firebase/firestore"
import type { Message } from "@/lib/types"
import { MessageInput } from "@/components/MessageInput"
import { MessageList } from "@/components/MessageList"
import { VoiceChat } from "@/components/VoiceChat"
import { Button } from "@/components/ui/button"
import { Phone } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface ChatRoomProps {
  roomId: string
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return

    const messagesRef = collection(db, "messages")
    const q = query(messagesRef, where("roomId", "==", roomId), orderBy("createdAt", "desc"), limit(50))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[]
      setMessages(newMessages.reverse())
    })

    return () => unsubscribe()
  }, [roomId, user])

  const sendMessage = async (text: string) => {
    if (!user || !text.trim()) return

    try {
      await addDoc(collection(db, "messages"), {
        roomId,
        text: text.trim(),
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">Chat Room</h2>
        <Button variant="outline" size="icon" onClick={() => setIsVoiceChatOpen(true)} className="ml-auto">
          <Phone className="h-4 w-4" />
        </Button>
      </div>

      <MessageList messages={messages} currentUser={user} />
      <MessageInput onSend={sendMessage} />

      <Dialog open={isVoiceChatOpen} onOpenChange={setIsVoiceChatOpen}>
        <DialogContent className="sm:max-w-[425px] bg-background text-foreground">
          <VoiceChat roomId={roomId} onEnd={() => setIsVoiceChatOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

