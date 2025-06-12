"use client"

import React, { useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import type { Message, SimpleUser } from "@/lib/types"
import { MessageReactions } from "@/components/chat/MessageReactions"
import { soundManager } from "@/lib/soundManager"
import { useAuth } from "@/components/auth/AuthProvider"
import { MessageExpirationService } from "@/lib/messageExpiration"
import { TypingIndicator } from "@/components/chat/TypingIndicator"

interface MessageListProps {
  messages: Message[]
  currentUser: SimpleUser | null
  roomId: string
  isDM?: boolean
}

export function MessageList({ messages, currentUser, roomId, isDM = false }: MessageListProps) {
  const { user } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [lastMessageCount, setLastMessageCount] = useState(messages.length)

  // Initialize expiration timers for messages
  useEffect(() => {
    if (messages.length > 0) {
      MessageExpirationService.initializeExpirationTimers()
    }

    // Cleanup on unmount
    return () => {
      MessageExpirationService.cleanup()
    }
  }, [messages.length])

  useEffect(() => {
    scrollToBottom()

    // Play sound for new messages
    if (messages.length > lastMessageCount) {
      const newMessages = messages.slice(lastMessageCount)
      const hasNewMessageFromOthers = newMessages.some(msg => msg.uid !== currentUser?.uid)

      if (hasNewMessageFromOthers) {
        if (isDM) {
          soundManager.playDM()
        } else {
          soundManager.playMessage()
        }
      }
    }

    setLastMessageCount(messages.length)
  }, [messages, lastMessageCount, currentUser, isDM])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return

    try {
      const token = await user.getIdToken()

      // Determine correct API endpoint based on room type
      let apiUrl: string
      if (roomId === 'lobby') {
        apiUrl = '/api/messages/reactions'
      } else if (isDM) {
        apiUrl = `/api/direct-messages/${roomId}/messages/${messageId}/reactions`
      } else {
        apiUrl = `/api/rooms/${roomId}/messages/${messageId}/reactions`
      }

      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messageId,
          emoji,
          action: 'add'
        })
      })

      if (!response.ok) {
        console.error('Failed to add reaction')
      }
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    if (!user) return

    try {
      const token = await user.getIdToken()

      // Determine correct API endpoint based on room type
      let apiUrl: string
      if (roomId === 'lobby') {
        apiUrl = '/api/messages/reactions'
      } else if (isDM) {
        apiUrl = `/api/direct-messages/${roomId}/messages/${messageId}/reactions`
      } else {
        apiUrl = `/api/rooms/${roomId}/messages/${messageId}/reactions`
      }

      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messageId,
          emoji,
          action: 'remove'
        })
      })

      if (!response.ok) {
        console.error('Failed to remove reaction')
      }
    } catch (error) {
      console.error('Error removing reaction:', error)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const displayName = message.displayName || "Anonymous"
        const photoURL = message.photoURL || ""
        const reactions = (message as any).reactions || {}

        return (
          <div
            key={message.id}
            className={`group flex ${message.uid === currentUser?.uid ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex flex-col gap-1 max-w-[80%] ${message.uid === currentUser?.uid ? "items-end" : "items-start"}`}
            >
              <div
                className={`flex items-start gap-2 ${message.uid === currentUser?.uid ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={photoURL} />
                  <AvatarFallback>{displayName[0] || message.uid[0] || "?"}</AvatarFallback>
                </Avatar>
                <div
                  className={`rounded-lg p-3 ${message.uid === currentUser?.uid
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-700 text-white"
                    }`}
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

              {/* Message Reactions */}
              <div className={message.uid === currentUser?.uid ? "mr-10" : "ml-10"}>
                <MessageReactions
                  messageId={message.id}
                  reactions={reactions}
                  currentUserId={currentUser?.uid || ''}
                  onReact={handleReaction}
                  onRemoveReaction={handleRemoveReaction}
                />
              </div>
            </div>
          </div>
        )
      })}
      <div ref={messagesEndRef} />

      {/* Typing Indicator */}
      {currentUser && (
        <TypingIndicator
          roomId={roomId}
          currentUserId={currentUser.uid}
          className="sticky bottom-0 bg-background/80 backdrop-blur-sm p-2"
        />
      )}
    </div>
  )
}

