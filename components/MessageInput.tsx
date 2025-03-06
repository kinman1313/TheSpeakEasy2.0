"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Smile, Paperclip, Mic, Send, X, ImageIcon } from "lucide-react"
import { EmojiPicker } from "@/components/EmojiPicker"
import { VoiceRecorder } from "@/components/audio/VoiceRecorder"
import { searchGiphy, getTrendingGiphy } from "@/lib/api"
import type { GiphyImage } from "@/lib/types"

interface MessageInputProps {
  onSend: (message: string) => void
  // Add other props as needed
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false)
  const [gifSearchQuery, setGifSearchQuery] = useState("")
  const [gifResults, setGifResults] = useState<GiphyImage[]>([])
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

  // Handle GIF search
  useEffect(() => {
    const fetchGifs = async () => {
      try {
        if (gifSearchQuery.trim()) {
          const results = await searchGiphy(gifSearchQuery)
          setGifResults(results)
        } else {
          const trending = await getTrendingGiphy()
          setGifResults(trending)
        }
      } catch (error) {
        console.error("Error fetching GIFs:", error)
        setGifResults([])
      }
    }

    if (isGifPickerOpen) {
      fetchGifs()
    }
  }, [gifSearchQuery, isGifPickerOpen])

  // Handle GIF selection
  const handleGifSelect = (gif: GiphyImage) => {
    // Here you would typically handle the GIF selection
    // For now, we'll just send the GIF URL as a message
    onSend(`[GIF] ${gif.images.original.url}`)
    setIsGifPickerOpen(false)
  }

  return (
    <div className="border-t p-4 bg-background">
      {isGifPickerOpen && (
        <div className="mb-4 p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <Input
              placeholder="Search GIFs..."
              value={gifSearchQuery}
              onChange={(e) => setGifSearchQuery(e.target.value)}
              className="flex-1 mr-2"
            />
            <Button variant="ghost" size="icon" onClick={() => setIsGifPickerOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
            {gifResults.map((gif) => (
              <img
                key={gif.id}
                src={gif.images.fixed_height.url || "/placeholder.svg"}
                alt={gif.title}
                className="rounded cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => handleGifSelect(gif)}
              />
            ))}
            {gifSearchQuery && gifResults.length === 0 && (
              <div className="col-span-3 text-center py-4 text-muted-foreground">No GIFs found</div>
            )}
          </div>
        </div>
      )}

      {isRecording && (
        <VoiceRecorder
          onRecordingComplete={(audioBlob) => {
            // Create a URL for the audio blob
            const audioUrl = URL.createObjectURL(audioBlob)
            // Send the audio message
            onSend(`[AUDIO] ${audioUrl}`)
            setIsRecording(false)
          }}
          onClose={() => setIsRecording(false)}
        />
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsGifPickerOpen(!isGifPickerOpen)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Smile className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
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
          {isEmojiPickerOpen && (
            <div className="absolute bottom-full mb-2">
              <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={() => setIsEmojiPickerOpen(false)} />
            </div>
          )}
        </div>
        {message.trim() ? (
          <Button onClick={handleSend} size="icon" className="rounded-full">
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsRecording(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  )
}

