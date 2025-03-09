"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, Timestamp } from "firebase/firestore"
import { app } from "@/lib/firebase"

// Initialize Firestore only if app is defined
const db = app ? getFirestore(app) : undefined

interface Message {
  id: string
  text: string
  userId: string
  userName: string
  userPhotoURL?: string
  timestamp: Timestamp
}

export default function ChatApp() {
  const { user } = useAuth()
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check if Firebase is initialized
  const isFirebaseReady = !!app && !!db

  useEffect(() => {
    if (!isFirebaseReady) return

    // Subscribe to messages
    const messagesRef = collection(db!, "messages")
    const q = query(messagesRef, orderBy("timestamp", "asc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[]
      setMessages(newMessages)
    })

    return () => unsubscribe()
  }, [isFirebaseReady])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() || !user || !isFirebaseReady) return

    try {
      await addDoc(collection(db!, "messages"), {
        text: message,
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        userPhotoURL: user.photoURL,
        timestamp: serverTimestamp(),
      })

      setMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-lg">Please sign in to use the chat</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2 ${
              msg.userId === user.uid ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={msg.userPhotoURL || ""} />
              <AvatarFallback>{msg.userName?.[0] || "?"}</AvatarFallback>
            </Avatar>
            <div
              className={`px-3 py-2 rounded-lg max-w-xs ${
                msg.userId === user.uid
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm font-medium">{msg.userName}</p>
              <p>{msg.text}</p>
              <p className="text-xs opacity-70">
                {msg.timestamp?.toDate().toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={!isFirebaseReady}
          />
          <Button type="submit" disabled={!message.trim() || !isFirebaseReady}>
            Send
          </Button>
        </div>
      </form>
    </div>
  )
}