"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SmilePlus, Heart, ThumbsUp, Laugh, Frown, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageReactionsProps {
  messageId: string
  reactions: Record<string, string[]> // emoji -> array of userIds
  currentUserId: string
  onReact: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
}

const REACTION_OPTIONS = [
  { emoji: '👍', label: 'Thumbs up', icon: <ThumbsUp className="h-4 w-4" /> },
  { emoji: '❤️', label: 'Heart', icon: <Heart className="h-4 w-4" /> },
  { emoji: '😂', label: 'Laugh', icon: <Laugh className="h-4 w-4" /> },
  { emoji: '😢', label: 'Sad', icon: <Frown className="h-4 w-4" /> },
  { emoji: '⭐', label: 'Star', icon: <Star className="h-4 w-4" /> },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '👏', label: 'Clap' },
]

export function MessageReactions({
  messageId,
  reactions = {},
  currentUserId,
  onReact,
  onRemoveReaction
}: MessageReactionsProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleReaction = (emoji: string) => {
    const hasReacted = reactions[emoji]?.includes(currentUserId)

    if (hasReacted) {
      onRemoveReaction(messageId, emoji)
    } else {
      onReact(messageId, emoji)
    }
    setIsOpen(false)
  }

  const hasReactions = Object.keys(reactions).length > 0

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Display existing reactions */}
      {Object.entries(reactions).map(([emoji, userIds]) => {
        const hasReacted = userIds.includes(currentUserId)
        const count = userIds.length

        if (count === 0) return null

        return (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            onClick={() => handleReaction(emoji)}
            className={cn(
              "h-8 px-2 py-1 text-xs gap-1 transition-all touch-manipulation",
              hasReacted
                ? "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/50"
                : "bg-slate-700/50 hover:bg-slate-700/70 text-slate-300"
            )}
          >
            <span className="text-sm">{emoji}</span>
            <span>{count}</span>
          </Button>
        )
      })}

      {/* Add reaction button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0 transition-all touch-manipulation",
              hasReactions
                ? "opacity-60 md:opacity-0 md:group-hover:opacity-100"
                : "opacity-70 hover:opacity-100"
            )}
          >
            <SmilePlus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 glass-card">
          <div className="grid grid-cols-4 gap-1">
            {REACTION_OPTIONS.map((reaction) => (
              <Button
                key={reaction.emoji}
                variant="ghost"
                size="sm"
                onClick={() => handleReaction(reaction.emoji)}
                className="h-12 w-12 p-0 hover:bg-slate-700/50 touch-manipulation"
                title={reaction.label}
              >
                <span className="text-lg">{reaction.emoji}</span>
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
