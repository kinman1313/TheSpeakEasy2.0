"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Smile } from "lucide-react"

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
  const handleReaction = (emoji: string) => {
    const hasReacted = reactions[emoji]?.includes(currentUserId)

    if (hasReacted) {
      onRemoveReaction(messageId, emoji)
    } else {
      onReact(messageId, emoji)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    handleReaction(emoji)
  }

  return (
    <div className="flex items-center gap-1 mt-2">
      {/* Display existing reactions */}
      {Object.entries(reactions).map(([emoji, userIds]) => (
        <Button
          key={emoji}
          variant="ghost"
          size="sm"
          className={`h-6 px-2 text-xs ${userIds.includes(currentUserId)
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          onClick={() => handleReaction(emoji)}
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
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
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
                className="h-8 w-8 p-0 hover:bg-slate-700"
                onClick={() => handleEmojiSelect(emoji)}
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
