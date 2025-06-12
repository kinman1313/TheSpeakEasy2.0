"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Smile, Paperclip, Mic, Send, ImageIcon, X, Upload, Clock, Reply } from "lucide-react"
import EmojiPicker from "@/components/chat/EmojiPicker"
import { VoiceRecorder } from "@/components/audio/VoiceRecorder"
import { uploadFile, uploadImage, formatFileSize, getFileIcon } from "@/lib/storage"
import { MESSAGE_EXPIRATION_OPTIONS, type ExpirationTimer, type FileUpload, type Message } from "@/lib/types"
import { TypingIndicatorService } from "@/lib/typingIndicators"
import { MessageExpirationService } from "@/lib/messageExpiration"
import { toast } from "sonner"

interface MessageInputProps {
  onSend: (message: string, options?: {
    fileUrl?: string
    fileName?: string
    fileSize?: number
    fileType?: string
    imageUrl?: string
    replyToId?: string
    expirationTimer?: ExpirationTimer
  }) => void
  onVoiceRecording?: (audioBlob: Blob) => void
  onGifSelect?: (gifUrl: string) => void
  // Threading support
  replyToMessage?: Message | null
  onCancelReply?: () => void
  // User info for typing indicators
  currentUserId?: string
  currentUserName?: string
  roomId?: string
  disabled?: boolean
}

export function MessageInput({
  onSend,
  onVoiceRecording,
  onGifSelect,
  replyToMessage,
  onCancelReply,
  currentUserId,
  currentUserName,
  roomId,
  disabled = false
}: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([])
  const [expirationTimer, setExpirationTimer] = useState<ExpirationTimer>('never')
  const [isUploading, setIsUploading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Enhanced typing indicators with multiple event listeners
  useEffect(() => {
    if (!currentUserId || !currentUserName || !roomId) return;

    const inputElement = inputRef.current;
    if (!inputElement) return;

    const handleTyping = () => {
      const currentMessage = inputElement.value || '';
      if (currentMessage.trim()) {
        TypingIndicatorService.debounceTyping(currentUserId, currentUserName, roomId);
      } else {
        TypingIndicatorService.stopTyping(currentUserId, roomId);
      }
    };

    // Add multiple event listeners
    const events = ['input', 'keydown', 'keyup', 'paste', 'cut'];
    events.forEach(event => inputElement.addEventListener(event, handleTyping));

    return () => {
      events.forEach(event => inputElement.removeEventListener(event, handleTyping));
      TypingIndicatorService.stopTyping(currentUserId, roomId);
    };
  }, [currentUserId, currentUserName, roomId]);

  const handleEmojiSelect = (emoji: string) => {
    const newMessage = message + emoji
    setMessage(newMessage)
    inputRef.current?.focus()
    setIsEmojiPickerOpen(false)
  }

  const handleSend = async () => {
    if ((!message.trim() && fileUploads.length === 0) || disabled || isUploading) return

    let sendOptions: any = {
      status: 'sending' // Initial status
    }

    // Handle file uploads first
    if (fileUploads.length > 0) {
      setIsUploading(true)
      try {
        const upload = fileUploads[0] // For now, handle one file at a time
        let uploadResult

        if (upload.file.type.startsWith('image/')) {
          uploadResult = await uploadImage(currentUserId!, upload.file)
          sendOptions.imageUrl = uploadResult.downloadURL
        } else {
          uploadResult = await uploadFile(currentUserId!, upload.file)
          sendOptions.fileUrl = uploadResult.downloadURL
          sendOptions.fileName = uploadResult.fileName
          sendOptions.fileSize = uploadResult.fileSize
          sendOptions.fileType = uploadResult.fileType
        }
      } catch (error) {
        console.error('Error uploading file:', error)
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }

    // Add threading support
    if (replyToMessage) {
      sendOptions.replyToId = replyToMessage.id
    }

    // Add expiration timer with validation
    if (expirationTimer !== 'never') {
      if (!MessageExpirationService.validateExpirationTimer(expirationTimer)) {
        toast.error("Please select a valid expiration time (minimum 5 minutes).")
        return
      }
      sendOptions.expirationTimer = expirationTimer
    }

    onSend(message, sendOptions)
    setMessage("")
    setFileUploads([])
    setExpirationTimer('never')
    inputRef.current?.focus()

    // Cancel reply mode
    if (onCancelReply) {
      onCancelReply()
    }

    // Stop typing indicator
    if (currentUserId && roomId) {
      TypingIndicatorService.stopTyping(currentUserId, roomId)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const supportedAudioTypes = [
      'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a'
    ]

    const newUploads: FileUpload[] = []
    for (const file of files) {
      // Only allow supported audio types
      if (file.type.startsWith('audio/') && !supportedAudioTypes.includes(file.type)) {
        alert('Unsupported audio format. Please upload .mp3, .m4a, or .webm files.')
        continue
      }
      const upload: FileUpload = { file }
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          upload.preview = e.target?.result as string
          setFileUploads(prev => [...prev])
        }
        reader.readAsDataURL(file)
      }
      newUploads.push(upload)
    }
    setFileUploads(prev => [...prev, ...newUploads])
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFileUpload = (index: number) => {
    setFileUploads(prev => prev.filter((_, i) => i !== index))
  }

  const handleGifClick = () => {
    if (onGifSelect) {
      onGifSelect("")
    }
  }

  return (
    <div
      className="w-full z-20 bg-glass/80 backdrop-blur-md border-t border-glass/30 px-2 py-2 fixed bottom-0 left-0 right-0 md:static md:rounded-b-lg md:backdrop-blur-none md:bg-transparent"
      style={{ maxWidth: 600, margin: '0 auto' }}
    >
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

      {/* Reply indicator */}
      {replyToMessage && (
        <div className="mb-2 p-2 bg-muted rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Reply className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-medium">{replyToMessage.userName}</span>
              <p className="text-muted-foreground truncate">
                {replyToMessage.text || (replyToMessage.imageUrl ? '🖼️ Image' : '📎 File')}
              </p>
            </div>
          </div>
          {onCancelReply && (
            <Button variant="ghost" size="sm" onClick={onCancelReply} className="tap-feedback">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* File upload previews */}
      {fileUploads.length > 0 && (
        <div className="mb-2 space-y-2">
          {fileUploads.map((upload, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              {upload.preview ? (
                <img src={upload.preview} alt="Preview" className="w-10 h-10 object-cover rounded" />
              ) : (
                <span className="text-2xl">{getFileIcon(upload.file.type)}</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{upload.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(upload.file.size)}</p>
                {upload.uploadProgress !== undefined && (
                  <div className="w-full bg-muted-foreground/20 rounded-full h-1 mt-1">
                    <div
                      className="bg-primary h-1 rounded-full transition-all duration-300"
                      style={{ width: `${upload.uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFileUpload(index)}
                disabled={isUploading}
                className="tap-feedback"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Expiration timer selector */}
      <div className="mb-2 flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <Select
          value={expirationTimer}
          onValueChange={(value: ExpirationTimer) => setExpirationTimer(value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Message expires..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MESSAGE_EXPIRATION_OPTIONS).map(([key, option]) => (
              <SelectItem key={key} value={key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/webm,audio/mp3,audio/mpeg,audio/mp4,audio/x-m4a,audio/m4a,.mp3,.m4a,.pdf,.doc,.docx,.txt,.zip,.rar"
        aria-label="Upload file"
      />

      <div className="flex items-center gap-1 md:gap-2">
        {/* File upload button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="text-muted-foreground hover:text-foreground h-9 w-9 md:h-10 md:w-10 touch-manipulation tap-feedback"
          title="Upload File"
          disabled={disabled || isUploading}
        >
          <Upload className="h-4 w-4 md:h-5 md:w-5" />
        </Button>

        {/* Image button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleGifClick}
          className="text-muted-foreground hover:text-foreground h-9 w-9 md:h-10 md:w-10 touch-manipulation tap-feedback"
          title="Add GIF"
          disabled={disabled}
        >
          <ImageIcon className="h-4 w-4 md:h-5 md:w-5" />
        </Button>

        {/* Emoji button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
          className="text-muted-foreground hover:text-foreground h-9 w-9 md:h-10 md:w-10 touch-manipulation tap-feedback"
          title="Add Emoji"
          disabled={disabled}
        >
          <Smile className="h-4 w-4 md:h-5 md:w-5" />
        </Button>

        {/* Attachment button (desktop only) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="hidden sm:flex text-muted-foreground hover:text-foreground h-9 w-9 md:h-10 md:w-10 touch-manipulation tap-feedback"
          title="Attach File"
          disabled={disabled || isUploading}
        >
          <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
        </Button>

        <div className="flex-1">
          <Input
            ref={inputRef}
            placeholder={replyToMessage ? "Reply..." : "Type a message..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="text-sm md:text-base h-9 md:h-10"
            disabled={disabled || isUploading}
          />
        </div>

        {message.trim() || fileUploads.length > 0 ? (
          <Button
            onClick={handleSend}
            size="icon"
            className="rounded-full h-9 w-9 md:h-10 md:w-10 touch-manipulation shrink-0 tap-feedback"
            title="Send Message"
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsRecording(true)}
            className="text-muted-foreground hover:text-foreground h-9 w-9 md:h-10 md:w-10 touch-manipulation shrink-0 tap-feedback"
            title="Record Voice Message"
            disabled={disabled}
          >
            <Mic className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        )}
      </div>
    </div>
  )
}

