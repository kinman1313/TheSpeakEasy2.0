"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SmilePlus } from 'lucide-react'
import { db } from "@/lib/firebase"
import { doc, updateDoc, arrayUnion, arrayRemove, type Firestore } from "firebase/firestore"
import { useAuth } from "@/components/auth/AuthProvider"
import { toast } from "sonner"

interface Reaction {
  emoji: string
  count: number
  users: string[]
}

interface Message {
  id: string
  text: string
  userId: string
  reactions?: Record<string, Reaction>
}

interface MessageReactionsProps {
  message: Message
}

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👀"]

export function MessageReactions({ message }: MessageReactionsProps) {
  const { user } = useAuth()
  const [isUpdating, setIsUpdating] = useState(false)

  // Check if Firebase is initialized
  const isFirebaseReady = typeof window !== 'undefined' && !!db;

  const handleReaction = async (emoji: string) => {
    if (!user || !isFirebaseReady || !db) {
      toast.error("You must be logged in to react")
      return
    }

    setIsUpdating(true)
    try {
      // Use type assertion to tell TypeScript that db is definitely a Firestore instance
      const firestore = db as Firestore;

      const messageRef = doc(firestore, "messages", message.id)
      const reactions = message.reactions ? { ...message.reactions } : {}

      // Check if user already reacted with this emoji
      const existingReaction = reactions[emoji]
      const userReacted = existingReaction?.users.includes(user.uid)

      if (userReacted) {
        // Remove user's reaction
        await updateDoc(messageRef, {
          [`reactions.${emoji}.count`]: existingReaction.count - 1,
          [`reactions.${emoji}.users`]: arrayRemove(user.uid),
        })
      } else {
        // Add user's reaction
        const newCount = (existingReaction?.count || 0) + 1
        await updateDoc(messageRef, {
          [`reactions.${emoji}.count`]: newCount,
          [`reactions.${emoji}.users`]: existingReaction
            ? arrayUnion(user.uid)
            : [user.uid],
        })
      }
    } catch (error) {
      console.error("Error updating reaction:", error)
      toast.error("Failed to update reaction")
    } finally {
      setIsUpdating(false)
    }
  }

  // Early return if not in browser
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    <div className="flex items-center mt-1 space-x-2">
      {message.reactions &&
        Object.entries(message.reactions).map(([emoji, reaction]) => {
          if (reaction.count > 0) {
            const userReacted = user && reaction.users.includes(user.uid)
            return (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className={`h-6 px-2 text-xs rounded-full ${
                  userReacted ? "bg-primary/20" : ""
                }`}
                onClick={() => handleReaction(emoji)}
                disabled={isUpdating || !isFirebaseReady}
              >
                {emoji} {reaction.count}
              </Button>
            )
          }
          return null
        })}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full"
            disabled={isUpdating || !isFirebaseReady}
          >
            <SmilePlus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="flex gap-1 flex-wrap max-w-[200px]">
            {EMOJI_LIST.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  handleReaction(emoji)
                }}
                disabled={isUpdating}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}