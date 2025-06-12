"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Smile, Heart, ThumbsUp, Laugh, Frown, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmojiPicker } from "./EmojiPicker"

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

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

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
  }

  const hasReactions = Object.keys(reactions).length > 0

  return (
    <div className="flex items-center gap-1">
      {/* Quick reaction buttons */}
      {REACTION_EMOJIS.map(emoji => (
        <Button
          key={emoji}
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 text-xs ${reactions[emoji]?.includes(currentUserId) ? 'bg-primary/10' : ''}`}
          onClick={() => handleReaction(emoji)}
        >
          {emoji}
          {reactions[emoji]?.length > 0 && (
            <span className="ml-1 text-xs">
              {reactions[emoji].length}
            </span>
          )}
        </Button>
      ))}

      {/* Emoji picker for more reactions */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <EmojiPicker
            onSelectEmoji={(emoji) => handleReaction(emoji)}
            disableRecent
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
