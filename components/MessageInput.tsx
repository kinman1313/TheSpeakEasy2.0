"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Smile, Paperclip, Mic, Send, ImageIcon } from "lucide-react"
import EmojiPicker from "@/components/chat/EmojiPicker"
import { VoiceRecorder } from "@/components/audio/VoiceRecorder"

interface MessageInputProps {
  onSend: (message: string) => void
  onVoiceRecording?: (audioBlob: Blob) => void
  onGifSelect?: (gifUrl: string) => void
  // Add other props as needed
}

export function MessageInput({ onSend, onVoiceRecording, onGifSelect }: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle sending a message
  const handleSend = () => {
    if (message.trim()) {
      onSend(message)
      setMessage("")
    }
  }

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji)
    setIsEmojiPickerOpen(false)
    inputRef.current?.focus()
  }

  // Handle GIF selection
  const handleGifClick = () => {
    if (onGifSelect) {
      // Trigger parent component's GIF picker
      onGifSelect('') // This will open the picker, actual selection handled by parent
    }
  }

  return (
    <div className="border-t p-2 md:p-4 bg-background">
      {/* Emoji Picker Modal */}
      {isEmojiPickerOpen && (
        <EmojiPicker onSelectEmoji={handleEmojiSelect} onClose={() => setIsEmojiPickerOpen(false)} />
      )}

      {/* Voice Recorder */}
      {isRecording && (
        <VoiceRecorder
          onRecordingComplete={(audioBlob) => {
            if (onVoiceRecording) {
              onVoiceRecording(audioBlob)
            }
            setIsRecording(false)
          }}
        />
      )}

      <div className="flex items-center gap-1 md:gap-2">
        {/* Hide some buttons on very small screens */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleGifClick}
          className="text-muted-foreground hover:text-foreground h-9 w-9 md:h-10 md:w-10 touch-manipulation"
          title="Add GIF"
        >
          <ImageIcon className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
          className="text-muted-foreground hover:text-foreground h-9 w-9 md:h-10 md:w-10 touch-manipulation"
          title="Add Emoji"
        >
          <Smile className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:flex text-muted-foreground hover:text-foreground h-9 w-9 md:h-10 md:w-10 touch-manipulation"
          title="Attach File"
        >
          <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
        <div className="relative flex-1 min-w-0">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="text-sm md:text-base h-9 md:h-10"
          />
        </div>
        {message.trim() ? (
          <Button
            onClick={handleSend}
            size="icon"
            className="rounded-full h-9 w-9 md:h-10 md:w-10 touch-manipulation shrink-0"
            title="Send Message"
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsRecording(true)}
            className="text-muted-foreground hover:text-foreground h-9 w-9 md:h-10 md:w-10 touch-manipulation shrink-0"
            title="Record Voice Message"
          >
            <Mic className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        )}
      </div>
    </div>
  )
}

