"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/textarea"
import { Send, Mic, MicOff, Image, Smile, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageInputProps {
  onSend: (message: string, options?: any) => void
  onVoiceRecording?: (audioBlob: Blob) => void
  onGifSelect?: () => void
  replyToMessage?: any
  onCancelReply?: () => void
  currentUserId?: string
  currentUserName?: string
  roomId?: string
  disabled?: boolean
  enhanced?: boolean
}

export default function MessageInput({
  onSend,
  onVoiceRecording,
  onGifSelect,
  replyToMessage,
  onCancelReply,
  currentUserId,
  currentUserName,
  roomId,
  disabled = false,
  enhanced = false
}: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage("")
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        onVoiceRecording?.(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  return (
    <div className={cn("space-y-3", enhanced && "glass-panel rounded-2xl p-4")}>
      {replyToMessage && (
        <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
          <div className="flex-1">
            <p className="text-xs text-slate-400">Replying to {replyToMessage.userName}</p>
            <p className="text-sm text-slate-300 truncate">{replyToMessage.text}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelReply}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            className={cn(
              "resize-none min-h-[40px] max-h-32",
              enhanced && "bg-white/10 border-white/20 text-white placeholder:text-white/60"
            )}
            rows={1}
          />
        </div>
        
        <div className="flex gap-1">
          {onGifSelect && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onGifSelect}
              disabled={disabled}
              className={cn(
                "text-slate-400 hover:text-white",
                enhanced && "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <Smile className="h-4 w-4" />
            </Button>
          )}
          
          {onVoiceRecording && (
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              disabled={disabled}
              className={cn(
                "text-slate-400 hover:text-white",
                isRecording && "text-red-400",
                enhanced && "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          
          <Button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            size="sm"
            className={cn(
              "bg-green-600 hover:bg-green-500 text-white",
              enhanced && "bg-green-500/80 hover:bg-green-500 backdrop-blur-sm"
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}