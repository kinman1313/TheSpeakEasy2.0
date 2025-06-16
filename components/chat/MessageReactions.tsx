"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Smile } from "lucide-react"
import { useState } from "react"

interface MessageReactionsProps {
  messageId: string
  reactions: Record<string, string[]> // emoji -> array of userIds
  currentUserId: string
  onReact: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

export function MessageReactions({
  messageId,
  reactions,
  currentUserId,
  onReact,
  onRemoveReaction
}: MessageReactionsProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  const handleEmojiSelect = async (emoji: string) => {
    if (isProcessing === emoji) return // Prevent double-clicks

    setIsProcessing(emoji)

    try {
      const userReactions = reactions[emoji] || []
      const hasReacted = userReactions.includes(currentUserId)

      console.log('Reaction click:', {
        messageId,
        emoji,
        hasReacted,
        currentUserId,
        userReactions
      })

      if (hasReacted) {
        await onRemoveReaction(messageId, emoji)
      } else {
        await onReact(messageId, emoji)
      }
    } catch (error) {
      console.error('Error handling reaction:', error)
    } finally {
      setIsProcessing(null)
    }
  }

  const handleReactionClick = async (emoji: string) => {
    if (isProcessing === emoji) return // Prevent double-clicks

    setIsProcessing(emoji)

    try {
      const userReactions = reactions[emoji] || []
      const hasReacted = userReactions.includes(currentUserId)

      console.log('Existing reaction click:', {
        messageId,
        emoji,
        hasReacted,
        currentUserId,
        userReactions
      })

      if (hasReacted) {
        await onRemoveReaction(messageId, emoji)
      } else {
        await onReact(messageId, emoji)
      }
    } catch (error) {
      console.error('Error handling reaction click:', error)
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <div className="flex items-center gap-1 mt-2">
      {/* Display existing reactions */}
      {Object.entries(reactions).map(([emoji, userIds]) => (
        <Button
          key={emoji}
          variant="ghost"
          size="sm"
          className={`h-6 px-2 text-xs transition-all duration-200 ${userIds.includes(currentUserId)
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            } ${isProcessing === emoji ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => handleReactionClick(emoji)}
          disabled={isProcessing === emoji}
        >
          {emoji} {userIds.length}
        </Button>
      ))}

      {/* Add reaction button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors duration-200"
            disabled={isProcessing !== null}
          >
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 bg-slate-800 border-slate-600">
          <div className="flex gap-1">
            {REACTION_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 hover:bg-slate-700 transition-colors duration-200 ${isProcessing === emoji ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                onClick={() => handleEmojiSelect(emoji)}
                disabled={isProcessing === emoji}
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
