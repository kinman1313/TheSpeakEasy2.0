"use client"

import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import type { Message, SimpleUser } from "@/lib/types"

interface MessageListProps {
  messages: Message[]
  currentUser: SimpleUser | null
}

export function MessageList({ messages, currentUser }: MessageListProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        // Get user info from the message or use defaults
        const displayName = message.displayName || "Anonymous"
        const photoURL = message.photoURL || ""

        return (
          <div
            key={message.id}
            className={`flex ${message.uid === currentUser?.uid ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex items-start gap-2 max-w-[80%] ${message.uid === currentUser?.uid ? "flex-row-reverse" : "flex-row"}`}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={photoURL} />
                <AvatarFallback>{displayName[0] || message.uid[0] || "?"}</AvatarFallback>
              </Avatar>
              <div
                className={`rounded-lg p-3 ${message.uid === currentUser?.uid ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                <div className="text-xs opacity-70 mb-1">
                  {displayName} •{" "}
                  {message.createdAt
                    ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })
                    : "just now"}
                </div>
                <div>{message.text}</div>
              </div>
            </div>
          </div>
        )
      })}
      <div ref={messagesEndRef} />
    </div>
  )
}

