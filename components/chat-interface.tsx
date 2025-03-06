"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore"
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} currentUser={customUser} />
      </div>
      <MessageInput onSend={sendMessage} />
    </div>
  )
}

