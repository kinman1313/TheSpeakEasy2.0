"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Smile, Paperclip, Mic } from "lucide-react"
import { VoiceRecorder } from "@/components/VoiceRecorder"
import { searchGiphy } from "@/lib/api"
import type { GiphyImage } from "@/lib/types"

interface MessageInputProps {
  onSend: (message: string) => void
  onSendGif?: (gifUrl: string) => void
  onSendAudio?: (audioUrl: string) => void
}

export function MessageInput({ onSend, onSendGif, onSendAudio }: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [gifs, setGifs] = useState<GiphyImage[]>([])
  const [isSearchingGifs, setIsSearchingGifs] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSend(message)
      setMessage("")
    }
  }

  const handleGifSearch = async (query: string) => {
    if (!query) return
    setIsSearchingGifs(true)
    try {
      const results = await searchGiphy(query)
      setGifs(results)
    } catch (error) {
      console.error("Error searching GIFs:", error)
    } finally {
      setIsSearchingGifs(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" type="button">
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <Input placeholder="Search GIFs..." onChange={(e) => handleGifSearch(e.target.value)} />
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {isSearchingGifs ? (
                  <div>Loading...</div>
                ) : (
                  gifs.map((gif) => (
                    <img
                      key={gif.id}
                      src={gif.images.fixed_height_small.url || "/placeholder.svg"}
                      alt={gif.title}
                      className="cursor-pointer rounded"
                      onClick={() => onSendGif?.(gif.images.original.url)}
                    />
                  ))
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="ghost" size="icon" type="button">
          <Paperclip className="h-5 w-5" />
        </Button>

        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message"
          className="flex-1"
        />

        <Popover open={isRecording} onOpenChange={setIsRecording}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" type="button">
              <Mic className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <VoiceRecorder
              onRecordingComplete={(blob) => {
                // Handle the audio blob
                console.log("Recording complete:", blob)
                setIsRecording(false)
              }}
            />
          </PopoverContent>
        </Popover>

        <Button type="submit" disabled={!message.trim()}>
          Send
        </Button>
      </div>
    </form>
  )
}

