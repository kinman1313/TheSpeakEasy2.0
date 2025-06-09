"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { db } from "@/lib/firebase"
import { collection, query, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore"
import { MessageList } from "./MessageList"
import { MessageInput } from "./MessageInput"
import type { Message, SimpleUser } from "@/lib/types"

interface ChatInterfaceProps {
  roomId: string
}

export function ChatInterface({ roomId }: ChatInterfaceProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    if (!roomId || !db) return

    const q = query(collection(db, "rooms", roomId, "messages"))

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData: any[] = []
      querySnapshot.forEach((doc) => {
        messagesData.push({
          id: doc.id,
          ...doc.data()
        })
      })
      // Sort messages client-side by createdAt
      messagesData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0
        return aTime - bTime
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} currentUser={customUser} roomId={roomId} />
      </div>
      <MessageInput onSend={sendMessage} />
    </div>
  )
}

