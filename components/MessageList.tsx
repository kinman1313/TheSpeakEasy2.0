"use client"

import { useEffect, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageReactions } from "@/components/MessageReactions"
import type { Message } from "@/lib/types"
import type { User } from "firebase/auth"

interface MessageListProps {
  messages: Message[]
  currentUser: User | null
}

export function MessageList({ messages, currentUser }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex items-start gap-2 ${message.uid === currentUser?.uid ? "flex-row-reverse" : ""}`}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.photoURL || `/api/avatar?name=${message.displayName}`} />
            <AvatarFallback>{message.displayName?.[0]}</AvatarFallback>
          </Avatar>

          <div className={`flex flex-col ${message.uid === currentUser?.uid ? "items-end" : "items-start"}`}>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{message.displayName}</span>
              <span className="text-xs text-muted-foreground">{message.createdAt?.toDate().toLocaleTimeString()}</span>
            </div>

            <div
              className={`mt-1 rounded-lg p-2 ${
                message.uid === currentUser?.uid ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {message.text}
            </div>

            {message.gifUrl && (
              <img src={message.gifUrl || "/placeholder.svg"} alt="GIF" className="mt-2 rounded-lg max-w-[200px]" />
            )}

            {message.audioUrl && <audio src={message.audioUrl} controls className="mt-2" />}

            <MessageReactions message={message} />
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

