"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MessageReactionsProps {
  messageId: string;
  currentReactions?: { [emoji: string]: string[] };
  userId: string;
  toggleReaction: (messageId: string, emoji: string, userId: string) => Promise<void>;
  isUpdatingReaction: boolean;
}

const COMMON_EMOJIS = ["👍", "❤️", "😂", "🎉", "🤔", "😮"];

export default function MessageReactions({
  messageId,
  currentReactions,
  userId,
  toggleReaction,
  isUpdatingReaction,
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleEmojiClick = async (emoji: string) => {
    if (isUpdatingReaction) return;
    try {
      await toggleReaction(messageId, emoji, userId);
    } catch (error) {
      console.error("Failed to toggle reaction from component", error);
    }
  };

  const userHasReacted = (emoji: string): boolean => {
    return currentReactions?.[emoji]?.includes(userId) || false;
  };

  return (
    <div className="mt-1 flex items-center space-x-1 relative flex-wrap"> {/* Added flex-wrap */}
      {currentReactions && Object.entries(currentReactions).map(([emoji, userIds]) => {
        if (userIds && userIds.length > 0) {
          return (
            <Button
              key={emoji}
              variant="outline"
              size="sm"
              onClick={() => handleEmojiClick(emoji)}
              disabled={isUpdatingReaction}
              className={cn(
                "px-2 py-1 h-auto text-xs rounded-full flex items-center space-x-1 my-0.5", // Added my-0.5 for vertical spacing if wrapped
                userHasReacted(emoji) ? "bg-primary/20 border-primary text-primary" : "hover:bg-muted/50"
              )}
              aria-label={`React with ${emoji}, currently ${userIds.length} reactions. ${userHasReacted(emoji) ? 'You have reacted with this emoji.' : ''}`}
            >
              <span>{emoji}</span>
              <span className="font-medium">{userIds.length}</span>
            </Button>
          );
        }
        return null;
      })}

      <div className="relative my-0.5"> {/* Wrapper for picker button and picker itself */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPicker(!showPicker)}
          disabled={isUpdatingReaction}
          className="px-2 py-1 h-auto text-xs rounded-full"
          aria-expanded={showPicker}
          aria-controls={`emoji-picker-${messageId}`}
          aria-label="Add reaction"
        >
          🙂
        </Button>

        {showPicker && (
          <div
            id={`emoji-picker-${messageId}`}
            className="absolute bottom-full mb-2 flex space-x-1 p-2 bg-background border rounded-lg shadow-lg z-10 min-w-max" // Added min-w-max
            role="dialog"
            aria-label="Emoji picker"
          >
            {COMMON_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="icon" // Changed to "icon" for potentially better sizing if emojis are small
                onClick={() => {
                  handleEmojiClick(emoji);
                  setShowPicker(false);
                }}
                disabled={isUpdatingReaction}
                className={cn(
                  "text-lg p-1 rounded-md", // Ensure padding is appropriate for "icon" size
                  userHasReacted(emoji) ? "bg-primary/10" : "hover:bg-muted/80" // Slightly different highlight for picker
                )}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
