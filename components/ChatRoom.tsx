"use client"

import React, { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  serverTimestamp,
  type Firestore,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Message {
  id: string
  text: string
  userId: string
  userName: string
  userPhotoURL?: string
  createdAt: any
}

export default function ChatRoom() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check if Firebase is initialized
  const isFirebaseReady = typeof window !== 'undefined' && !!db;

  useEffect(() => {
    // Skip if Firebase is not initialized
    if (!isFirebaseReady || !db) return;

    // Use type assertion to tell TypeScript that db is definitely a Firestore instance
    const firestore = db as Firestore;

    // Use firestore instead of db directly
    const q = query(collection(firestore, "messages"));

    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const msgs: Message[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      // Sort messages client-side by createdAt
      msgs.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return aTime - bTime;
      });
      setMessages(msgs);

      // Scroll to bottom of messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    })

    return () => unsubscribe()
  }, [isFirebaseReady, db])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !user || !isFirebaseReady || !db) return

    try {
      // Use type assertion to tell TypeScript that db is definitely a Firestore instance
      const firestore = db as Firestore;

      // Use firestore instead of db directly
      await addDoc(collection(firestore, "messages"), {
        text: newMessage,
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        userPhotoURL: user.photoURL,
        createdAt: serverTimestamp(),
      })

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  // Early return if not in browser
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-2 ${message.userId === user?.uid ? "flex-row-reverse" : "flex-row"
              }`}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.userPhotoURL || ""} />
              <AvatarFallback>{message.userName?.[0] || "?"}</AvatarFallback>
            </Avatar>
            <div
              className={`px-3 py-2 rounded-lg max-w-xs ${message.userId === user?.uid
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
                }`}
            >
              <p className="text-sm font-medium">{message.userName}</p>
              <p>{message.text}</p>
              <p className="text-xs opacity-70">
                {message.createdAt?.toDate().toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={!isFirebaseReady || !user}
          />
          <Button type="submit" disabled={!newMessage.trim() || !isFirebaseReady || !user}>
            Send
          </Button>
        </div>
      </form>
    </div>
  )
}