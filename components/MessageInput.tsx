"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Smile, Paperclip, Mic, Send, ImageIcon } from "lucide-react"
import EmojiPicker from "@/components/chat/EmojiPicker"
import GiphyPicker from "@/components/chat/GiphyPicker"
import { VoiceRecorder } from "@/components/audio/VoiceRecorder"

interface MessageInputProps {
  onSend: (message: string) => void
  // Add other props as needed
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false)
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
  const handleGifSelect = (gifUrl: string) => {
    onSend(`[GIF] ${gifUrl}`)
    setIsGifPickerOpen(false)
  }

  return (
    <div className="border-t p-4 bg-background">
      {/* Giphy Picker Modal */}
      {isGifPickerOpen && (
        <GiphyPicker onSelectGif={handleGifSelect} onClose={() => setIsGifPickerOpen(false)} />
      )}

      {/* Emoji Picker Modal */}
      {isEmojiPickerOpen && (
        <EmojiPicker onSelectEmoji={handleEmojiSelect} onClose={() => setIsEmojiPickerOpen(false)} />
      )}

      {/* Voice Recorder */}
      {isRecording && (
        <VoiceRecorder
          onRecordingComplete={(audioBlob) => {
            // Create a URL for the audio blob
            const audioUrl = URL.createObjectURL(audioBlob)
            // Send the audio message
            onSend(`[AUDIO] ${audioUrl}`)
            setIsRecording(false)
          }}
        />
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsGifPickerOpen(!isGifPickerOpen)}
          className="text-muted-foreground hover:text-foreground"
          title="Add GIF"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
          className="text-muted-foreground hover:text-foreground"
          title="Add Emoji"
        >
          <Smile className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" title="Attach File">
          <Paperclip className="h-5 w-5" />
        </Button>
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="pr-10"
          />
        </div>
        {message.trim() ? (
          <Button onClick={handleSend} size="icon" className="rounded-full" title="Send Message">
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsRecording(true)}
            className="text-muted-foreground hover:text-foreground"
            title="Record Voice Message"
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  )
}

